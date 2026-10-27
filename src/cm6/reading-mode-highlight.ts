import { type Extension, Transaction } from "@codemirror/state";
import { type EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import {
  type MarkdownPostProcessorContext,
  type MarkdownView,
  TFile,
  type WorkspaceLeaf,
} from "obsidian";
import type TypewriterModeLib from "@/lib";
import {
  clearHighlightAppearance,
  updateHighlightAppearance,
} from "./highlight-appearance";
import {
  getMarkdownBlockAtLine,
  type MarkdownBlockKind,
  type MarkdownSectionRange,
  sectionMatchesBlock,
  sourceBlockMatches,
} from "./markdown-block";

const highlightClass = "ptm-reading-current-block";
const blockSelectors = {
  blockquote: ".el-blockquote, blockquote, .callout",
  code: ".el-pre, pre",
  heading:
    ".el-h1, .el-h2, .el-h3, .el-h4, .el-h5, .el-h6, h1, h2, h3, h4, h5, h6",
  list: ".el-ul, .el-ol, ul, ol",
  paragraph: ".el-p, p",
  table: ".el-table, table",
} as const;

interface ReadingPosition {
  filePath: string;
  line: number;
  source: string;
}

interface RenderedBlockSection {
  filePath: string;
  kind: MarkdownBlockKind;
  range: MarkdownSectionRange;
  sourceToken: string;
}

interface SourceSnapshot {
  filePath: string;
  source: string;
}

const renderedBlockAttribute = "data-ptm-reading-source";
const renderedBlockSelector = `[${renderedBlockAttribute}]`;

export default class ReadingModeHighlight {
  private readonly tm: TypewriterModeLib;
  private readonly positions = new Map<WorkspaceLeaf, ReadingPosition>();
  private readonly highlights = new Map<WorkspaceLeaf, Set<HTMLElement>>();
  private readonly mutationObservers = new Map<
    WorkspaceLeaf,
    MutationObserver
  >();
  private readonly elementSnapshots = new WeakMap<
    HTMLElement,
    SourceSnapshot
  >();
  private readonly sourceSnapshots = new Map<string, SourceSnapshot>();
  private readonly sourceSnapshotTokensByFile = new Map<
    string,
    Array<{ token: string; source: string }>
  >();
  private readonly overlays = new Map<WorkspaceLeaf, HTMLElement>();
  private readonly leafCleanups = new Map<WorkspaceLeaf, () => void>();
  private sourceSnapshotSequence = 0;
  private unloaded = false;

  constructor(tm: TypewriterModeLib) {
    this.tm = tm;
    this.processMarkdown = this.processMarkdown.bind(this);
    this.onLayoutChange = this.onLayoutChange.bind(this);
  }

  createEditorExtension(): Extension {
    const manager = this;
    return ViewPlugin.fromClass(
      class {
        private readonly view: EditorView;
        private readonly onInteraction: () => void;

        constructor(view: EditorView) {
          this.view = view;
          this.onInteraction = () => manager.recordEditorPosition(view);
          view.dom.addEventListener("pointerdown", this.onInteraction);
          view.dom.addEventListener("keydown", this.onInteraction);
        }

        update(update: ViewUpdate) {
          if (
            update.docChanged &&
            manager.getMarkdownView(update.view)?.getMode() !== "source"
          ) {
            manager.forgetPosition(update.view);
            return;
          }

          const hasUserInteraction = update.transactions.some(
            (transaction) =>
              transaction.annotation(Transaction.userEvent) !== undefined
          );
          if (
            hasUserInteraction &&
            (update.docChanged || update.selectionSet)
          ) {
            manager.recordEditorPosition(update.view);
          }
        }

        destroy() {
          this.view.dom.removeEventListener("pointerdown", this.onInteraction);
          this.view.dom.removeEventListener("keydown", this.onInteraction);
        }
      }
    );
  }

  load() {
    this.tm.plugin.registerMarkdownPostProcessor(
      this.processMarkdown,
      Number.MAX_SAFE_INTEGER
    );
    this.tm.plugin.registerEvent(
      this.tm.plugin.app.workspace.on("layout-change", this.onLayoutChange)
    );
    this.refresh();
  }

  unload() {
    this.unloaded = true;
    this.clearHighlights();
    this.positions.clear();
    for (const leaf of this.tm.plugin.app.workspace.getLeavesOfType(
      "markdown"
    )) {
      this.clearRenderedBlockAttributes(leaf);
    }
    this.sourceSnapshots.clear();
    this.sourceSnapshotTokensByFile.clear();
  }

  clearHighlights() {
    for (const elements of this.highlights.values()) {
      for (const element of elements) {
        element.classList.remove(highlightClass);
      }
    }
    this.highlights.clear();
    for (const overlay of this.overlays.values()) {
      clearHighlightAppearance(overlay);
      overlay.remove();
    }
    this.overlays.clear();
    for (const cleanup of this.leafCleanups.values()) {
      cleanup();
    }
    this.leafCleanups.clear();
    for (const observer of this.mutationObservers.values()) {
      observer.disconnect();
    }
    this.mutationObservers.clear();
  }

  refresh() {
    for (const leaf of this.tm.plugin.app.workspace.getLeavesOfType(
      "markdown"
    )) {
      const view = this.asMarkdownView(leaf);
      if (!view) {
        continue;
      }
      if (this.isReadingFeatureEnabled()) {
        this.ensureLeafObserver(leaf);
      } else {
        this.disconnectLeafObserver(leaf);
      }
      if (view.getMode() === "preview") {
        this.applyHighlightForLeaf(leaf);
      }
    }
  }

  private asMarkdownView(leaf: WorkspaceLeaf): MarkdownView | null {
    const view = leaf.view as MarkdownView;
    return leaf.view.getViewType() === "markdown" &&
      typeof view.getMode === "function"
      ? view
      : null;
  }

  private getLeafContainer(leaf: WorkspaceLeaf): HTMLElement {
    return (leaf as WorkspaceLeaf & { containerEl: HTMLElement }).containerEl;
  }

  private getMarkdownView(editorView: EditorView): MarkdownView | null {
    const leafElement = editorView.dom.closest(".workspace-leaf");
    if (!leafElement) {
      return null;
    }
    const leaf = this.tm.plugin.app.workspace
      .getLeavesOfType("markdown")
      .find((candidate) => this.getLeafContainer(candidate) === leafElement);
    return leaf ? this.asMarkdownView(leaf) : null;
  }

  private getLeaf(element: HTMLElement): WorkspaceLeaf | null {
    const leafElement = element.closest(".workspace-leaf");
    if (!leafElement) {
      return null;
    }
    return (
      this.tm.plugin.app.workspace
        .getLeavesOfType("markdown")
        .find(
          (candidate) => this.getLeafContainer(candidate) === leafElement
        ) ?? null
    );
  }

  private recordEditorPosition(editorView: EditorView) {
    if (this.unloaded) {
      return;
    }
    const leafElement = editorView.dom.closest(".workspace-leaf");
    if (!leafElement) {
      return;
    }
    const leaf = this.tm.plugin.app.workspace
      .getLeavesOfType("markdown")
      .find((candidate) => this.getLeafContainer(candidate) === leafElement);
    if (!leaf) {
      return;
    }
    const markdownView = this.asMarkdownView(leaf);
    const filePath = markdownView?.file?.path;
    if (markdownView?.getMode() !== "source" || !filePath) {
      return;
    }

    const selection = editorView.state.selection.main;
    this.positions.set(leaf, {
      filePath,
      line: editorView.state.doc.lineAt(selection.head).number - 1,
      source: editorView.state.doc.toString(),
    });
  }

  private forgetPosition(editorView: EditorView) {
    const leafElement = editorView.dom.closest(".workspace-leaf");
    const leaf = leafElement
      ? this.tm.plugin.app.workspace
          .getLeavesOfType("markdown")
          .find((candidate) => this.getLeafContainer(candidate) === leafElement)
      : undefined;
    if (leaf) {
      this.positions.delete(leaf);
      this.clearLeafHighlights(leaf);
    }
  }

  private isEnabledFor(view: MarkdownView): boolean {
    const settings = this.tm.settings;
    if (
      !(
        settings.general.isPluginActivated &&
        settings.currentLine.isHighlightCurrentLineEnabled &&
        settings.currentLine.isHighlightLastBlockInReadingModeEnabled
      )
    ) {
      return false;
    }

    const file = view.file;
    if (!file) {
      return false;
    }
    const frontmatter =
      this.tm.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    return !(
      frontmatter &&
      Object.hasOwn(frontmatter, "typewriter-mode") &&
      !frontmatter["typewriter-mode"]
    );
  }

  private async processMarkdown(
    element: HTMLElement,
    context: MarkdownPostProcessorContext
  ) {
    if (this.unloaded || element.closest(".markdown-embed")) {
      return;
    }
    // Obsidian also runs post processors before a section is attached to a leaf.
    // Record its provenance now; the leaf observer applies it after attachment.
    const filePath = context.sourcePath;
    const file = this.tm.plugin.app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) {
      return;
    }
    const leaf = this.getLeaf(element);
    const view = leaf ? this.asMarkdownView(leaf) : null;
    const renderedCandidates = new Set<HTMLElement>();
    const sections: Array<{
      candidate: HTMLElement;
      kind: MarkdownBlockKind;
      range: MarkdownSectionRange;
    }> = [];
    for (const [kind, selector] of Object.entries(blockSelectors) as [
      MarkdownBlockKind,
      string,
    ][]) {
      const candidates: HTMLElement[] = [];
      if (element.matches(selector)) {
        candidates.push(element);
      }
      candidates.push(
        ...Array.from(element.querySelectorAll<HTMLElement>(selector))
      );
      for (const candidate of candidates) {
        renderedCandidates.add(candidate);
        const range = context.getSectionInfo(candidate);
        if (range) {
          sections.push({ candidate, kind, range });
        }
      }
    }
    // Capture section info synchronously: its context can expire after rendering.
    const currentSource =
      view?.file?.path === filePath
        ? view.editor.getValue()
        : await this.tm.plugin.app.vault.cachedRead(file);
    if (this.unloaded) {
      return;
    }
    const sourceToken = this.getSourceSnapshotToken(filePath, currentSource);
    const sourceSnapshot = this.sourceSnapshots.get(sourceToken);
    if (!sourceSnapshot) {
      return;
    }
    for (const { candidate, kind, range } of sections) {
      this.elementSnapshots.set(candidate, sourceSnapshot);
      candidate.setAttribute(renderedBlockAttribute, sourceToken);
      candidate.dataset.ptmReadingBlockKind = kind;
      candidate.dataset.ptmReadingBlockStart = String(range.lineStart);
      candidate.dataset.ptmReadingBlockEnd = String(range.lineEnd);
    }
    if (leaf) {
      if (this.isReadingFeatureEnabled()) {
        this.ensureLeafObserver(leaf);
      }
      this.applyHighlightForLeaf(leaf, [...renderedCandidates]);
    }
  }

  private applyHighlightForLeaf(
    leaf: WorkspaceLeaf,
    additionalCandidates: HTMLElement[] = []
  ) {
    const view = this.asMarkdownView(leaf);
    const filePath = view?.file?.path;
    const position = this.positions.get(leaf);
    if (
      view?.getMode() !== "preview" ||
      !filePath ||
      !position ||
      position.filePath !== filePath
    ) {
      this.clearLeafHighlights(leaf);
      return;
    }
    if (!this.isEnabledFor(view)) {
      this.clearLeafHighlights(leaf);
      return;
    }

    const currentSource = view.editor.getValue();
    if (currentSource !== position.source) {
      this.positions.delete(leaf);
      this.clearLeafHighlights(leaf);
      return;
    }

    const block = getMarkdownBlockAtLine(position.source, position.line);
    if (!block) {
      this.clearLeafHighlights(leaf);
      return;
    }

    const candidates = [
      ...new Set([
        ...this.getLeafContainer(leaf).querySelectorAll<HTMLElement>(
          renderedBlockSelector
        ),
        ...additionalCandidates,
      ]),
    ];
    const matchingCandidates = candidates
      .map((candidate) => ({
        candidate,
        section: this.getRenderedBlockSection(candidate),
      }))
      .filter(
        (
          entry
        ): entry is {
          candidate: HTMLElement;
          section: RenderedBlockSection;
        } => {
          if (
            entry.candidate.closest(".markdown-embed, .markdown-source-view") ||
            !entry.section ||
            entry.section.filePath !== filePath ||
            entry.section.kind !== block.kind ||
            !sectionMatchesBlock(entry.section.range, block)
          ) {
            return false;
          }
          const snapshot =
            this.elementSnapshots.get(entry.candidate) ??
            this.sourceSnapshots.get(entry.section.sourceToken);
          return (
            snapshot !== undefined &&
            sourceBlockMatches(snapshot.source, currentSource, block)
          );
        }
      );
    const matching = matchingCandidates.filter(
      ({ candidate }) =>
        !matchingCandidates.some(
          ({ candidate: other }) =>
            other !== candidate && other.contains(candidate)
        )
    );
    if (matching.length !== 1) {
      this.clearLeafHighlights(leaf);
      return;
    }

    const target = matching[0].candidate;
    if (!this.highlights.get(leaf)?.has(target)) {
      this.clearLeafHighlights(leaf);
      target.classList.add(highlightClass);
      this.highlights.set(leaf, new Set([target]));
    }
    this.updateOverlay(leaf, target);
  }

  private isReadingFeatureEnabled(): boolean {
    const settings = this.tm.settings;
    return (
      settings.general.isPluginActivated &&
      settings.currentLine.isHighlightCurrentLineEnabled &&
      settings.currentLine.isHighlightLastBlockInReadingModeEnabled
    );
  }

  private ensureLeafObserver(leaf: WorkspaceLeaf) {
    if (this.unloaded || this.mutationObservers.has(leaf)) {
      return;
    }
    const container = this.getLeafContainer(leaf);
    const ownerWindow = container.ownerDocument.defaultView;
    if (!ownerWindow) {
      return;
    }
    let frame = 0;
    const schedule = () => {
      if (frame || this.unloaded) {
        return;
      }
      frame = ownerWindow.requestAnimationFrame(() => {
        frame = 0;
        this.applyHighlightForLeaf(leaf);
      });
    };
    const observer = new MutationObserver((records) => {
      if (!this.isReadingFeatureEnabled()) {
        return;
      }
      const relevantChange = records.some((record) => {
        if (record.type === "attributes") {
          return true;
        }
        return [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            node.nodeType !== 1 ||
            !(node as Element).classList.contains(
              "ptm-reading-highlight-overlay"
            )
        );
      });
      if (relevantChange) {
        schedule();
      }
    });
    const resize = new ResizeObserver(schedule);
    resize.observe(container);
    const sizer = container.querySelector(".markdown-preview-sizer");
    if (sizer) {
      resize.observe(sizer);
    }
    container.addEventListener("scroll", schedule, true);
    this.leafCleanups.set(leaf, () => {
      if (frame) {
        ownerWindow.cancelAnimationFrame(frame);
      }
      resize.disconnect();
      container.removeEventListener("scroll", schedule, true);
    });
    observer.observe(container, {
      attributes: true,
      attributeFilter: [renderedBlockAttribute],
      childList: true,
      subtree: true,
    });
    this.mutationObservers.set(leaf, observer);
  }

  private disconnectLeafObserver(leaf: WorkspaceLeaf) {
    this.mutationObservers.get(leaf)?.disconnect();
    this.mutationObservers.delete(leaf);
    this.leafCleanups.get(leaf)?.();
    this.leafCleanups.delete(leaf);
  }

  private getSourceSnapshotToken(filePath: string, source: string): string {
    let snapshots = this.sourceSnapshotTokensByFile.get(filePath);
    if (!snapshots) {
      snapshots = [];
      this.sourceSnapshotTokensByFile.set(filePath, snapshots);
    }
    const existing = snapshots.find((snapshot) => snapshot.source === source);
    if (existing) {
      return existing.token;
    }

    const token = String(++this.sourceSnapshotSequence);
    snapshots.push({ token, source });
    if (snapshots.length > 16) {
      const expired = snapshots.shift();
      if (expired) {
        this.sourceSnapshots.delete(expired.token);
      }
    }
    this.sourceSnapshots.set(token, { filePath, source });
    return token;
  }

  private getRenderedBlockSection(
    element: HTMLElement
  ): RenderedBlockSection | null {
    const sourceToken = element.getAttribute(renderedBlockAttribute);
    const kind = element.dataset.ptmReadingBlockKind as
      | MarkdownBlockKind
      | undefined;
    const startLine = Number(element.dataset.ptmReadingBlockStart);
    const endLine = Number(element.dataset.ptmReadingBlockEnd);
    const snapshot =
      this.elementSnapshots.get(element) ??
      (sourceToken ? this.sourceSnapshots.get(sourceToken) : undefined);
    if (
      !(
        sourceToken &&
        snapshot &&
        kind &&
        Number.isInteger(startLine) &&
        Number.isInteger(endLine)
      )
    ) {
      return null;
    }
    return {
      filePath: snapshot.filePath,
      kind,
      range: { lineStart: startLine, lineEnd: endLine },
      sourceToken,
    };
  }

  private clearRenderedBlockAttributesFromElement(element: HTMLElement) {
    this.elementSnapshots.delete(element);
    element.removeAttribute(renderedBlockAttribute);
    delete element.dataset.ptmReadingBlockKind;
    delete element.dataset.ptmReadingBlockStart;
    delete element.dataset.ptmReadingBlockEnd;
  }

  private clearRenderedBlockAttributes(leaf: WorkspaceLeaf) {
    const elements = this.getLeafContainer(leaf).querySelectorAll<HTMLElement>(
      renderedBlockSelector
    );
    for (const element of elements) {
      this.clearRenderedBlockAttributesFromElement(element);
    }
  }

  private updateOverlay(leaf: WorkspaceLeaf, target: HTMLElement) {
    const preview = target.closest<HTMLElement>(".markdown-preview-view");
    if (!(preview && target.isConnected)) {
      return;
    }
    let overlay = this.overlays.get(leaf);
    if (!overlay || overlay.parentElement !== preview) {
      overlay?.remove();
      overlay = preview.ownerDocument.createElement("div");
      overlay.className = "ptm-reading-highlight-overlay";
      overlay.setAttribute("aria-hidden", "true");
      preview.appendChild(overlay);
      this.overlays.set(leaf, overlay);
    }
    const rect = target.getBoundingClientRect();
    const bounds = preview.getBoundingClientRect();
    overlay.style.top = `${rect.top - bounds.top + preview.scrollTop - preview.clientTop}px`;
    overlay.style.height = `${rect.height}px`;
    updateHighlightAppearance(
      overlay,
      preview,
      preview.querySelector<HTMLElement>(".markdown-preview-sizer"),
      this.tm.settings.currentLine,
      rect.height
    );
  }

  private clearLeafHighlights(leaf: WorkspaceLeaf) {
    const overlay = this.overlays.get(leaf);
    if (overlay) {
      clearHighlightAppearance(overlay);
      overlay.remove();
    }
    this.overlays.delete(leaf);
    for (const element of this.highlights.get(leaf) ?? []) {
      element.classList.remove(highlightClass);
    }
    this.highlights.delete(leaf);
  }

  private syncPreviewPosition(
    leaf: WorkspaceLeaf,
    view: MarkdownView,
    filePath: string
  ) {
    const position = this.positions.get(leaf);
    if (
      position &&
      (position.filePath !== filePath ||
        position.source !== view.editor.getValue())
    ) {
      this.positions.delete(leaf);
      this.clearLeafHighlights(leaf);
    }
  }

  private onLayoutChange() {
    const openLeaves = new Set(
      this.tm.plugin.app.workspace.getLeavesOfType("markdown")
    );
    if (!this.isReadingFeatureEnabled()) {
      for (const leaf of this.mutationObservers.keys()) {
        this.disconnectLeafObserver(leaf);
      }
    }
    for (const leaf of new Set<WorkspaceLeaf>([
      ...openLeaves,
      ...this.positions.keys(),
      ...this.highlights.keys(),
    ])) {
      const view = this.asMarkdownView(leaf);
      if (!(openLeaves.has(leaf) && view)) {
        this.disconnectLeafObserver(leaf);
        this.positions.delete(leaf);
        this.clearLeafHighlights(leaf);
        this.clearRenderedBlockAttributes(leaf);
        continue;
      }
      if (this.isReadingFeatureEnabled()) {
        this.ensureLeafObserver(leaf);
      }
      const filePath = view.file?.path;
      const position = this.positions.get(leaf);
      if (!filePath) {
        this.positions.delete(leaf);
        this.clearLeafHighlights(leaf);
        this.clearRenderedBlockAttributes(leaf);
      } else if (view.getMode() === "preview") {
        this.syncPreviewPosition(leaf, view, filePath);
        this.applyHighlightForLeaf(leaf);
      } else if (position && position.filePath !== filePath) {
        this.positions.delete(leaf);
        this.clearLeafHighlights(leaf);
        this.clearRenderedBlockAttributes(leaf);
      } else {
        this.clearLeafHighlights(leaf);
      }
    }
  }
}
