import type { Extension } from "@codemirror/state";
import { type EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import {
  type MarkdownPostProcessorContext,
  type MarkdownView,
  Platform,
  type WorkspaceLeaf,
} from "obsidian";
import type TypewriterModeLib from "@/lib";
import {
  getMarkdownBlockAtLine,
  type MarkdownBlockKind,
  type MarkdownSectionRange,
  sectionMatchesBlock,
} from "./markdown-block";

const highlightClass = "ptm-reading-current-block";
const blockSelectors = {
  blockquote: ".el-blockquote",
  code: ".el-pre",
  heading: ".el-h1, .el-h2, .el-h3, .el-h4, .el-h5, .el-h6",
  list: ".el-ul, .el-ol",
  paragraph: ".el-p",
  table: ".el-table",
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
  private readonly sourceSnapshots = new Map<string, SourceSnapshot>();
  private readonly sourceSnapshotTokensByFile = new Map<
    string,
    Array<{ token: string; source: string }>
  >();
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
        constructor(view: EditorView) {
          manager.recordEditorPosition(view);
        }

        update(update: ViewUpdate) {
          if (
            update.docChanged &&
            manager.getMarkdownView(update.view)?.getMode() !== "source"
          ) {
            manager.forgetPosition(update.view);
          } else if (update.docChanged || update.selectionSet) {
            manager.recordEditorPosition(update.view);
          }
        }
      }
    );
  }

  load() {
    this.tm.plugin.registerMarkdownPostProcessor(this.processMarkdown);
    this.tm.plugin.registerEvent(
      this.tm.plugin.app.workspace.on("layout-change", this.onLayoutChange)
    );
    if (this.isReadingFeatureEnabled()) {
      for (const leaf of this.tm.plugin.app.workspace.getLeavesOfType(
        "markdown"
      )) {
        this.ensureLeafObserver(leaf);
      }
    }
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
      if (view.getMode() !== "source") {
        this.applyHighlightForLeaf(leaf);
        continue;
      }
      const filePath = view.file?.path;
      if (!filePath) {
        continue;
      }
      const cursor = view.editor.getCursor();
      this.positions.set(leaf, {
        filePath,
        line: cursor.line,
        source: view.editor.getValue(),
      });
    }
  }

  private asMarkdownView(leaf: WorkspaceLeaf): MarkdownView | null {
    return leaf.view.getViewType() === "markdown"
      ? (leaf.view as MarkdownView)
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

  private isEnabledFor(view: MarkdownView, filePath: string): boolean {
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

    if (
      settings.currentLine
        .isHighlightCurrentLineOnlyInWritingFocusModeEnabled &&
      !document.body.classList.contains("ptm-focus-mode")
    ) {
      return false;
    }

    switch (settings.general.enabledPlatforms) {
      case "desktop":
        if (Platform.isMobile) {
          return false;
        }
        break;
      case "mobile":
        if (Platform.isDesktop) {
          return false;
        }
        break;
      case "tablet":
        if (!Platform.isTablet) {
          return false;
        }
        break;
      case "phone":
        if (!Platform.isPhone) {
          return false;
        }
        break;
      case "desktop-and-tablet":
        if (Platform.isPhone) {
          return false;
        }
        break;
      default:
        break;
    }

    const matchesPath = (configuredPath: string) =>
      configuredPath === "" ||
      filePath === configuredPath ||
      filePath.startsWith(`${configuredPath}/`);
    if (settings.general.disabledFilePaths.some(matchesPath)) {
      return false;
    }
    if (
      settings.general.enabledFilePaths.length > 0 &&
      !settings.general.enabledFilePaths.some(matchesPath)
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

  private processMarkdown(
    element: HTMLElement,
    context: MarkdownPostProcessorContext
  ) {
    if (this.unloaded || element.closest(".markdown-embed")) {
      return;
    }
    const leaf = this.getLeaf(element);
    if (!leaf) {
      return;
    }
    const view = this.asMarkdownView(leaf);
    const filePath = view?.file?.path;
    if (
      view?.getMode() !== "preview" ||
      !filePath ||
      context.sourcePath !== filePath
    ) {
      return;
    }
    if (this.isReadingFeatureEnabled()) {
      this.ensureLeafObserver(leaf);
    }

    const currentSource = view.editor.getValue();
    const position = this.positions.get(leaf);
    if (position && currentSource !== position.source) {
      if (position) {
        this.positions.delete(leaf);
      }
      this.clearLeafHighlights(leaf);
    }

    const sourceToken = this.getSourceSnapshotToken(filePath, currentSource);
    const renderedCandidates = new Set<HTMLElement>();
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
          candidate.setAttribute(renderedBlockAttribute, sourceToken);
          candidate.dataset.ptmReadingBlockKind = kind;
          candidate.dataset.ptmReadingBlockStart = String(range.lineStart);
          candidate.dataset.ptmReadingBlockEnd = String(range.lineEnd);
        }
      }
    }
    this.applyHighlightForLeaf(leaf, [...renderedCandidates]);
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
    if (!this.isEnabledFor(view, filePath)) {
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
        ): entry is { candidate: HTMLElement; section: RenderedBlockSection } =>
          entry.section !== null &&
          entry.section.filePath === filePath &&
          entry.section.kind === block.kind &&
          this.sourceSnapshots.get(entry.section.sourceToken)?.source ===
            currentSource &&
          sectionMatchesBlock(entry.section.range, block)
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
    this.clearLeafHighlights(leaf);
    target.classList.add(highlightClass);
    this.highlights.set(leaf, new Set([target]));
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
    const observer = new MutationObserver((records) => {
      if (!this.isReadingFeatureEnabled()) {
        return;
      }
      const relevantChange = records.some((record) => {
        if (record.type === "attributes") {
          return record.attributeName === renderedBlockAttribute;
        }
        return [...record.addedNodes].some((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            return false;
          }
          const element = node as HTMLElement;
          return (
            element.matches(renderedBlockSelector) ||
            element.querySelector(renderedBlockSelector) !== null
          );
        });
      });
      if (relevantChange) {
        this.applyHighlightForLeaf(leaf);
      }
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
    const snapshot = sourceToken
      ? this.sourceSnapshots.get(sourceToken)
      : undefined;
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

  private clearLeafHighlights(leaf: WorkspaceLeaf) {
    for (const element of this.highlights.get(leaf) ?? []) {
      element.classList.remove(highlightClass);
    }
    this.highlights.delete(leaf);
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
      if (!filePath || (position && position.filePath !== filePath)) {
        this.positions.delete(leaf);
        this.clearLeafHighlights(leaf);
        this.clearRenderedBlockAttributes(leaf);
      } else if (view.getMode() === "preview") {
        this.applyHighlightForLeaf(leaf);
      } else {
        this.clearLeafHighlights(leaf);
      }
    }
  }
}
