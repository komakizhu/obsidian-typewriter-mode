import { Transaction } from "@codemirror/state";
import { type EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { editorInfoField, Platform } from "obsidian";
import type { CurrentLinePositionData } from "@/cm6/current-line-position-calculator";
import { CurrentLinePositionCalculator } from "@/cm6/current-line-position-calculator";
import type { PerWindowProps } from "@/cm6/per-window-props";
import type TypewriterModeLib from "@/lib";
import { getEditorFilePath } from "./editor-identity";
import {
  clearHighlightAppearance,
  updateHighlightAppearance,
} from "./highlight-appearance";
import { normalizeSelectionRange } from "./selection-utils";
import { getEditorDom, getScrollDom } from "./selectors";
import { isMarkdownTableBlock } from "./table-detection";
import { inspectTransactionState } from "./transaction-state";

const currentLineClass = "ptm-current-line";
export const currentLineRefreshEvent = "ptm-refresh-current-line";

// Pointer selection moves the highlighted line but does not recenter the view.
const USER_EVENT_ALLOWED_DEFAULT = /^(select|input|delete|undo|redo)(\..+)?$/;
const USER_EVENT_DISALLOWED_DEFAULT = /^(select.pointer)$/;
class TypewriterModeCM6Plugin {
  protected tm: TypewriterModeLib;
  protected view: EditorView;

  private domResizeObserver: ResizeObserver | null = null;
  private tableWidgetObserver: MutationObserver | null = null;
  private embeddedMarkdownObserver: MutationObserver | null = null;
  private tableOverlayCheckFrame: number | null = null;
  private readonly pendingAnimationFrames = new Set<number>();
  private isDestroyed = false;

  private readonly onScrollEventKey: "wheel" | "touchmove";
  private isListeningToOnScroll = false;

  private isInitialInteraction = true;
  private isRenderingAllowedUserEvent = false;
  private isNestedEditorFocused = false;

  private isPerWindowPropsReloadRequired = false;
  private editorFilePath: string | null = null;
  private measurementGeneration = 0;

  private readonly onScrollBound = this.onScroll.bind(this);
  private readonly onResizeBound = this.onResize.bind(this);
  private readonly onFocusInBound = this.onFocusIn.bind(this);
  private readonly onEditorInteractionBound =
    this.onEditorInteraction.bind(this);
  private readonly onTableDomMutationBound = this.onTableDomMutation.bind(this);
  private readonly onCurrentLineRefreshBound =
    this.onCurrentLineRefresh.bind(this);

  constructor(tm: TypewriterModeLib, view: EditorView) {
    this.tm = tm;
    this.view = view;
    this.editorFilePath = this.getEditorFilePath(view);

    this.onScrollEventKey = Platform.isMobile ? "touchmove" : "wheel";

    this.onLoad();
  }

  destroy() {
    this.isDestroyed = true;
    this.domResizeObserver?.disconnect();
    this.tableWidgetObserver?.disconnect();
    this.embeddedMarkdownObserver?.disconnect();
    if (this.tableOverlayCheckFrame !== null) {
      window.cancelAnimationFrame(this.tableOverlayCheckFrame);
      this.tableOverlayCheckFrame = null;
    }
    for (const frame of this.pendingAnimationFrames) {
      window.cancelAnimationFrame(frame);
    }
    this.pendingAnimationFrames.clear();

    this.destroyCurrentLine();
    this.removeScrollListener();
    this.view.dom.removeEventListener(
      "pointerdown",
      this.onEditorInteractionBound
    );
    this.view.dom.removeEventListener("keydown", this.onEditorInteractionBound);
    this.view.dom.removeEventListener(
      currentLineRefreshEvent,
      this.onCurrentLineRefreshBound
    );

    this.view.dom.ownerDocument.removeEventListener(
      "focusin",
      this.onFocusInBound,
      true
    );
  }

  protected onLoad() {
    console.debug("onLoad");

    this.domResizeObserver = new ResizeObserver(this.onResizeBound);
    this.domResizeObserver.observe(this.view.dom.ownerDocument.body);

    this.watchEmbeddedMarkdown();
    this.tableWidgetObserver = new MutationObserver(
      this.onTableDomMutationBound
    );
    this.tableWidgetObserver.observe(this.view.dom, {
      childList: true,
      subtree: true,
    });
    this.scheduleTableOverlayCheck(8);
    this.view.dom.ownerDocument.addEventListener(
      "focusin",
      this.onFocusInBound,
      true
    );
    this.view.dom.addEventListener(
      "pointerdown",
      this.onEditorInteractionBound
    );
    this.view.dom.addEventListener("keydown", this.onEditorInteractionBound);
    this.view.dom.addEventListener(
      currentLineRefreshEvent,
      this.onCurrentLineRefreshBound
    );
    this.view.dom.classList.add("ptm-first-open");
    this.onReconfigured();

    this.scheduleAnimationFrame(() => {
      this.restoreCursorPosition(this.view);
    });
  }

  private userEventAllowed(event: string) {
    return (
      USER_EVENT_ALLOWED_DEFAULT.test(event) &&
      !USER_EVENT_DISALLOWED_DEFAULT.test(event)
    );
  }

  private inspectTransactions(update: ViewUpdate) {
    return inspectTransactionState(
      update.transactions.map((transaction) => ({
        reconfigured: transaction.reconfigured,
        userEvent: transaction.annotation(Transaction.userEvent) ?? undefined,
      })),
      (event) => this.userEventAllowed(event)
    );
  }

  update(update: ViewUpdate) {
    this.measurementGeneration += 1;
    const { isReconfigured, isUserEvent, allowedUserEvents } =
      this.inspectTransactions(update);

    const editorFilePath = this.getEditorFilePath(this.view);
    const fileChanged = editorFilePath !== this.editorFilePath;
    if (fileChanged) {
      this.editorFilePath = editorFilePath;
      this.isPerWindowPropsReloadRequired = true;
      this.destroyCurrentLine();
    }

    if (isReconfigured) {
      this.onReconfigured();
    }

    if (this.isDisabled()) {
      this.destroyCurrentLine();
      return;
    }

    if (fileChanged) {
      this.restoreCursorPosition(this.view);
    }

    if (this.isPerWindowPropsReloadRequired) {
      this.updateAfterExternalEvent();
      return;
    }

    if (this.isTableCell()) {
      this.destroyCurrentLine();
      return;
    }

    if (!isUserEvent) {
      return;
    }

    if (allowedUserEvents) {
      this.updateAllowedUserEvent();
    } else {
      this.updateDisallowedUserEvent();
    }
  }

  private isTableCell() {
    // A nested-editor focus event can remain stale after focus returns to the
    // outer editor. Only treat the editor as a table cell when the current DOM
    // or document position still proves that it is inside a table.
    if (this.isActiveTableEditor()) {
      return true;
    }

    if (this.isInMarkdownTableBlock()) {
      return true;
    }

    const activeLine = this.view.contentDOM.querySelector(".cm-active.cm-line");
    if (activeLine?.closest(".HyperMD-table-row")) {
      return true;
    }

    return (
      this.view.dom.parentElement?.parentElement?.className.contains(
        "table-cell-wrapper"
      ) ?? false
    );
  }

  private isActiveTableEditor() {
    const activeElement = this.view.dom.ownerDocument.activeElement;
    const tableEditor =
      this.view.dom.querySelector<HTMLElement>(".table-editor");
    return Boolean(
      activeElement instanceof Element && tableEditor?.contains(activeElement)
    );
  }

  private onTableDomMutation() {
    this.scheduleTableOverlayCheck();
  }

  private scheduleAnimationFrame(callback: () => void): number | null {
    if (this.isDestroyed) {
      return null;
    }

    let frame = 0;
    frame = window.requestAnimationFrame(() => {
      this.pendingAnimationFrames.delete(frame);
      if (!this.isDestroyed) {
        callback();
      }
    });
    this.pendingAnimationFrames.add(frame);
    return frame;
  }

  private scheduleTableOverlayCheck(remainingFrames = 4) {
    if (this.isDestroyed || this.tableOverlayCheckFrame !== null) {
      return;
    }

    this.tableOverlayCheckFrame = this.scheduleAnimationFrame(() => {
      if (this.isDestroyed) {
        return;
      }
      this.tableOverlayCheckFrame = null;
      if (this.removeCurrentLineIfOverTable()) {
        return;
      }

      if (
        remainingFrames > 0 &&
        this.view.dom.querySelector(`.${currentLineClass}`)
      ) {
        this.scheduleTableOverlayCheck(remainingFrames - 1);
      }
    });
  }

  private isCurrentLineOverTable(view: EditorView, currentLine: HTMLElement) {
    const currentLineRect = currentLine.getBoundingClientRect();
    if (!(currentLineRect.width && currentLineRect.height)) {
      return false;
    }

    const tableEditors =
      view.dom.querySelectorAll<HTMLElement>(".table-editor");
    const tableWidgets = tableEditors.length
      ? tableEditors
      : view.dom.querySelectorAll<HTMLElement>("table");

    return Array.from(tableWidgets).some((tableWidget) => {
      const tableRect = tableWidget.getBoundingClientRect();
      return (
        currentLineRect.left < tableRect.right &&
        currentLineRect.right > tableRect.left &&
        currentLineRect.top < tableRect.bottom &&
        currentLineRect.bottom > tableRect.top
      );
    });
  }

  private removeCurrentLineIfOverTable(view: EditorView = this.view) {
    const editorDom = getEditorDom(view);
    const currentLine = editorDom?.querySelector<HTMLElement>(
      `.${currentLineClass}`
    );
    if (!(currentLine && this.isCurrentLineOverTable(view, currentLine))) {
      return false;
    }

    this.destroyCurrentLine(view);
    return true;
  }

  private isInMarkdownTableBlock() {
    const { doc } = this.view.state;
    const activeLineNumber = doc.lineAt(
      this.view.state.selection.main.head
    ).number;
    const lines = Array.from(
      { length: doc.lines },
      (_, index) => doc.line(index + 1).text
    );
    return isMarkdownTableBlock(lines, activeLineNumber);
  }

  private onFocusIn(event: FocusEvent) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const focusedEditor = target.closest(".cm-editor");
    const isTextInput = target.matches(
      "input, textarea, [contenteditable='true'], [role='textbox']"
    );
    this.isNestedEditorFocused = Boolean(
      target !== this.view.contentDOM &&
        (isTextInput || (focusedEditor && focusedEditor !== this.view.dom))
    );

    if (this.isNestedEditorFocused) {
      this.destroyCurrentLine();
    }
  }

  private getEditorInfo(view: EditorView = this.view) {
    try {
      return view.state.field(editorInfoField, false);
    } catch {
      return;
    }
  }

  private getEditorFilePath(view: EditorView = this.view) {
    return getEditorFilePath(this.getEditorInfo(view));
  }

  private getEditorFile(view: EditorView = this.view) {
    return this.getEditorInfo(view)?.file ?? null;
  }

  private isMarkdownFile(view: EditorView = this.view) {
    const hasFile = this.getEditorFilePath(view) !== null;
    if (!hasFile) {
      this.isPerWindowPropsReloadRequired = true;
    }
    return hasFile;
  }

  private isDisabledInFrontmatter(view: EditorView = this.view) {
    const file = this.getEditorFile(view);
    if (!file) {
      this.isPerWindowPropsReloadRequired = true;
      return false;
    }

    const frontmatter =
      this.tm.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!frontmatter) {
      return false;
    }

    if (!Object.hasOwn(frontmatter, "typewriter-mode")) {
      return false;
    }

    return !frontmatter["typewriter-mode"];
  }

  private isDisabled(view: EditorView = this.view) {
    let disabled = false;
    if (!this.tm.settings.general.isPluginActivated) {
      disabled = true;
    } else if (!this.isMarkdownFile(view)) {
      disabled = true;
    } else if (this.isDisabledInFrontmatter(view)) {
      disabled = true;
    }
    return disabled;
  }

  private onReconfigured(): void {
    console.debug("onReconfigured");

    this.isPerWindowPropsReloadRequired = true;

    if (this.isDisabled()) {
      this.destroyCurrentLine();
      this.loadPerWindowProps();
    } else {
      this.updateAfterExternalEvent();
    }
    this.scheduleTableOverlayCheck(8);
  }

  private watchEmbeddedMarkdown() {
    const selector = ".markdown-embed-content iframe.embed-iframe";
    const props = this.tm.perWindowProps;
    this.embeddedMarkdownObserver = new MutationObserver((mutations) => {
      if (this.isDestroyed) {
        return;
      }
      mutations.forEach((mutation) => {
        [].forEach.call(mutation.addedNodes, (node: Node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            (node as HTMLElement).matches(selector)
          ) {
            const body = (node as HTMLIFrameElement).contentDocument?.body;
            if (!body) {
              return;
            }
            this.loadPerWindowPropsOnElement(props, body);
          }
        });
      });
    });
    this.embeddedMarkdownObserver.observe(this.view.dom.ownerDocument, {
      childList: true,
      subtree: true,
    });
  }

  private loadPerWindowPropsOnElement(props: PerWindowProps, el: HTMLElement) {
    console.debug("loadPerWindowPropsOnElement", props, el);

    // remove all classes set by this plugin
    for (const c of props.allBodyClasses) {
      el.classList.remove(c);
    }

    el.addClasses(props.persistentBodyClasses);
    el.addClasses(props.bodyClasses);

    el.setCssProps(props.cssVariables);
    el.setAttrs(props.bodyAttrs);
  }

  private getMarkdownBodies() {
    const embeddedMarkdownContent =
      this.view.dom.ownerDocument.querySelectorAll(
        ".markdown-embed-content iframe.embed-iframe"
      );
    const embeddedMarkdownBodies: HTMLElement[] = Array.from(
      embeddedMarkdownContent
    ).flatMap((i) => {
      const body = (i as HTMLIFrameElement).contentDocument?.body;
      return body ? [body] : [];
    });
    return [this.view.dom.ownerDocument.body, ...embeddedMarkdownBodies];
  }

  private loadPerWindowProps() {
    console.debug("loadPerWindowProps");

    if (!this.isPerWindowPropsReloadRequired) {
      return;
    }
    this.isPerWindowPropsReloadRequired = false;

    const bodies = this.getMarkdownBodies();
    for (const b of bodies) {
      this.loadPerWindowPropsOnElement(this.tm.perWindowProps, b);
    }
  }

  private loadCurrentLine(view: EditorView = this.view) {
    console.debug("loadCurrentLine");

    const editorDom = getEditorDom(view);
    if (!editorDom) {
      return null;
    }

    const currentLineContainer = getScrollDom(view) ?? editorDom;

    let currentLine = editorDom.querySelector(
      `.${currentLineClass}`
    ) as HTMLElement;

    if (!currentLine) {
      currentLine = editorDom.ownerDocument.createElement("div");
      currentLine.className = currentLineClass;
    }
    if (currentLine.parentElement !== currentLineContainer) {
      currentLineContainer.appendChild(currentLine);
    }

    return currentLine;
  }

  private destroyCurrentLine(view: EditorView = this.view) {
    console.debug("destroyCurrentLine");

    const editorDom = getEditorDom(view);
    if (!editorDom) {
      return;
    }

    const currentLine = editorDom.querySelector(
      `.${currentLineClass}`
    ) as HTMLElement;
    if (currentLine) {
      clearHighlightAppearance(currentLine);
    }
    currentLine?.remove();
  }

  private setupScrollListener() {
    console.debug("setupScrollListener");

    if (this.isListeningToOnScroll) {
      return;
    }
    const scrollDom = getScrollDom(this.view);
    if (scrollDom) {
      scrollDom.addEventListener(this.onScrollEventKey, this.onScrollBound, {
        passive: true,
      });
      scrollDom.addEventListener("scroll", this.onScrollBound, {
        passive: true,
      });
      this.isListeningToOnScroll = true;
    }
  }

  private removeScrollListener() {
    console.debug("removeScrollListener");

    if (!this.isListeningToOnScroll) {
      return;
    }
    const scrollDom = getScrollDom(this.view);
    if (scrollDom) {
      scrollDom.removeEventListener(this.onScrollEventKey, this.onScrollBound);
      scrollDom.removeEventListener("scroll", this.onScrollBound);
      this.isListeningToOnScroll = false;
    }
  }

  private measureCurrentLinePosition(
    key: string,
    write: (measure: CurrentLinePositionData | null, view: EditorView) => void
  ): boolean {
    if (this.isDestroyed) {
      return false;
    }

    const generation = this.measurementGeneration;
    const expectedFilePath = this.getEditorFilePath(this.view);
    const expectedDocument = this.view.state.doc;

    try {
      this.view.requestMeasure({
        key,
        read: (view: EditorView) => {
          try {
            return new CurrentLinePositionCalculator(
              view
            ).getCurrentLinePositionData();
          } catch (error) {
            console.error("Failed to measure current line position:", error);
            return null;
          }
        },
        write: (measure, view) => {
          this.scheduleAnimationFrame(() => {
            if (
              this.isDestroyed ||
              generation !== this.measurementGeneration ||
              this.getEditorFilePath(view) !== expectedFilePath ||
              view.state.doc !== expectedDocument
            ) {
              return;
            }
            write(measure, view);
          });
        },
      });
      return true;
    } catch (error) {
      console.error("Failed to request current line measurement:", error);
      return false;
    }
  }

  private updateAllowedUserEvent() {
    console.debug("updateAllowedUserEvent");

    this.removeScrollListener();
    this.revealCurrentLineAfterInteraction();

    this.isRenderingAllowedUserEvent = true;

    const isMeasureScheduled = this.measureCurrentLinePosition(
      "CurrentLineUpdateAfterAllowedUserEvent",
      (measure, view) => {
        if (!measure) {
          this.isRenderingAllowedUserEvent = false;
          this.setupScrollListener();
          return;
        }
        this.moveCurrentLineIfEnabled(view, measure);
        this.isRenderingAllowedUserEvent = false;
        this.handleCursorStateUpdate(view);
        this.setupScrollListener();
      }
    );
    if (!isMeasureScheduled) {
      this.isRenderingAllowedUserEvent = false;
      this.setupScrollListener();
    }
  }

  private updateDisallowedUserEvent() {
    console.debug("updateDisallowedUserEvent");

    if (this.isRenderingAllowedUserEvent) {
      return;
    }

    this.revealCurrentLineAfterInteraction();

    this.measureCurrentLinePosition(
      "CurrentLineUpdateAfterDisallowedUserEvent",
      (measure, view) => {
        if (!measure) {
          return;
        }
        this.handleCursorStateUpdate(view);
        this.moveCurrentLineIfEnabled(view, measure);
      }
    );
  }

  private onEditorInteraction() {
    this.revealCurrentLineAfterInteraction();
  }

  private onCurrentLineRefresh() {
    if (this.isDestroyed || this.isDisabled()) {
      return;
    }
    this.revealCurrentLineAfterInteraction();
    this.updateAfterExternalEvent();
  }

  private revealCurrentLineAfterInteraction() {
    if (!this.isInitialInteraction) {
      return;
    }
    this.isInitialInteraction = false;
    getEditorDom(this.view)?.classList.remove("ptm-first-open");
  }

  private onResize() {
    this.scheduleTableOverlayCheck();
    if (this.isDisabled()) {
      this.destroyCurrentLine();
      return;
    }
    this.updateAfterExternalEvent();
  }

  private onScroll() {
    this.scheduleTableOverlayCheck(2);
    this.measureCurrentLinePosition("CurrentLineOnScroll", (measure, view) => {
      if (!measure) {
        return;
      }
      this.moveCurrentLineIfEnabled(view, measure);
    });
  }

  private updateAfterExternalEvent() {
    console.debug("updateAfterExternalEvent");

    this.scheduleTableOverlayCheck(8);

    this.loadPerWindowProps();

    if (this.isTableCell()) {
      this.destroyCurrentLine();
      return;
    }

    const isMeasureScheduled = this.measureCurrentLinePosition(
      "CurrentLineUpdateAfterExternalEvent",
      (measure, view) => {
        this.setupScrollListener();

        if (!measure) {
          return;
        }
        this.moveCurrentLineIfEnabled(view, measure);
      }
    );
    if (!(isMeasureScheduled || this.isDestroyed)) {
      this.setupScrollListener();
    }
  }

  private moveCurrentLine(
    view: EditorView,
    lineOffset: number,
    lineHeight: number
  ) {
    console.debug("moveCurrentLine", lineOffset, lineHeight);

    // Obsidian renders a Live Preview Markdown table as one oversized
    // CodeMirror line. Never paint that widget as a normal current line.
    if (this.isTableCell()) {
      this.destroyCurrentLine(view);
      return;
    }

    const caretCoords = view.coordsAtPos(view.state.selection.main.head);
    if (!caretCoords) {
      this.destroyCurrentLine(view);
      return;
    }

    const currentLine = this.loadCurrentLine(view);
    if (!currentLine) {
      return;
    }

    const scrollDom = getScrollDom(view);
    const editorDom = getEditorDom(view);
    const editorRect = editorDom.getBoundingClientRect();
    const activeLineOffset = caretCoords.top - editorRect.top;
    const scrollContentOffset = scrollDom
      ? scrollDom.scrollTop +
        (editorRect.top - scrollDom.getBoundingClientRect().top)
      : 0;

    currentLine.style.height = `${lineHeight}px`;
    currentLine.style.top = `${activeLineOffset - lineOffset + scrollContentOffset}px`;

    updateHighlightAppearance(
      currentLine,
      scrollDom ?? editorDom,
      editorDom.querySelector<HTMLElement>(".cm-sizer") ?? view.contentDOM,
      this.tm.settings.currentLine,
      lineHeight
    );

    if (this.removeCurrentLineIfOverTable(view)) {
      return;
    }
  }

  private moveCurrentLineIfEnabled(
    view: EditorView,
    measure: CurrentLinePositionData
  ) {
    if (!this.tm.settings.currentLine.isHighlightCurrentLineEnabled) {
      return;
    }
    this.moveCurrentLine(view, measure.lineOffset, measure.lineHeight);
  }

  private handleCursorStateUpdate(view: EditorView) {
    console.debug("handleCursorStateUpdate");

    if (
      !this.tm.settings.restoreCursorPosition.isRestoreCursorPositionEnabled
    ) {
      return;
    }

    const filePath = this.getEditorFilePath(view);
    if (!filePath) {
      return;
    }

    this.tm
      .getRestoreCursorPositionFeature()
      .setCursorState(filePath, view.state.selection.main);
  }

  private restoreCursorPosition(view: EditorView) {
    console.debug("Start restoreCursorPosition");

    if (
      this.isDestroyed ||
      !this.tm.settings.restoreCursorPosition.isRestoreCursorPositionEnabled
    ) {
      return;
    }

    const rcp = this.tm.getRestoreCursorPositionFeature();

    // Persite the previous state everytime a new file is opened
    rcp.saveState().catch((error) => {
      console.error("Failed to save cursor state:", error);
    });

    const fileName = this.getEditorFilePath(view);

    if (fileName) {
      const st = rcp.state[fileName];
      if (st) {
        // Don't scroll when a link scrolls and highlights text
        // i.e. if file is open by links like [link](note.md#header) and wikilinks
        // See https://github.com/dy-sh/obsidian-remember-cursor-position issues #10, #32, #46, #51
        const containsFlashingSpan =
          this.tm.plugin.app.workspace.containerEl.querySelector(
            "span.is-flashing"
          );
        console.debug("containsFlashingSpan", containsFlashingSpan);

        const selection = normalizeSelectionRange(st, view.state.doc.length);
        if (selection && !containsFlashingSpan) {
          console.debug("Dispatch restoreCursorPosition", fileName, st);
          const expectedFilePath = fileName;
          this.scheduleAnimationFrame(() => {
            if (
              this.isDestroyed ||
              !this.tm.settings.restoreCursorPosition
                .isRestoreCursorPositionEnabled ||
              this.getEditorFilePath(view) !== expectedFilePath
            ) {
              return;
            }
            if (
              this.tm.plugin.app.workspace.containerEl.querySelector(
                "span.is-flashing"
              )
            ) {
              return;
            }
            const currentSelection = normalizeSelectionRange(
              st,
              view.state.doc.length
            );
            if (currentSelection) {
              view.dispatch({ selection: currentSelection });
            }
          });
        }
      }
    }
  }
}

export default function createTypewriterModeViewPlugin(tm: TypewriterModeLib) {
  return ViewPlugin.define(
    (view: EditorView) => new TypewriterModeCM6Plugin(tm, view)
  );
}
