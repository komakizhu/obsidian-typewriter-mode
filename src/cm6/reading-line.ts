import type { MarkdownBlockKind } from "./markdown-block";

const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})/;
const TASK_CHECKBOX = /^\[[ xX]\]\s+/;
const SOURCE_NEWLINES = /\r\n?/g;
const MARKDOWN_ENTITY = /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi;
const IMAGE_OR_LINK = /!?\[([^\]]*)\]\([^)]*\)/g;
const REFERENCE_LINK = /\[([^\]]+)\]\[[^\]]*\]/g;
const WIKI_LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const MARKDOWN_TAG = /<[^>]*>/g;
const INLINE_FORMAT = /(`+|\*{1,3}|_{1,3}|~~)(.*?)\1/g;
const MARKDOWN_ESCAPE = /\\([\\`*_{}[\]()#+\-.!<>|])/g;
const TRAILING_ESCAPE = /\\$/g;
const TRAILING_SPACES = /\s{2,}$/g;
const MARKDOWN_FILENAME = /\.md$/i;
const READING_WHITESPACE = /\s+/gu;
const BLOCKQUOTE_PREFIX = /^\s{0,3}>\s?/;
const SETEXT_HEADING = /^\s{0,3}(?:=+|-{3,})\s*$/;
const ATX_HEADING_PREFIX = /^\s{0,3}#{1,6}\s*/;
const LIST_PREFIX = /^\s*(?:(?:[-+*]|\d+[.)])\s+)/;
const WHITESPACE = /\s/u;

function decodeEntities(value: string): string {
  return value.replace(MARKDOWN_ENTITY, (match, entity: string) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith("#x")) {
      return decodeCodePoint(Number.parseInt(normalized.slice(2), 16), match);
    }
    if (normalized.startsWith("#")) {
      return decodeCodePoint(Number.parseInt(normalized.slice(1), 10), match);
    }
    return (
      {
        amp: "&",
        apos: "'",
        gt: ">",
        lt: "<",
        nbsp: "\u00a0",
        quot: '"',
      }[normalized] ?? match
    );
  });
}

function decodeCodePoint(codePoint: number, original: string): string {
  if (
    !Number.isInteger(codePoint) ||
    codePoint < 0 ||
    codePoint > 0x10_ff_ff ||
    (codePoint >= 0xd8_00 && codePoint <= 0xdf_ff)
  ) {
    return original;
  }
  return String.fromCodePoint(codePoint);
}

function stripInlineMarkdown(value: string): string {
  return decodeEntities(
    value
      .replace(/<!--.*?-->/g, "")
      .replace(IMAGE_OR_LINK, "$1")
      .replace(REFERENCE_LINK, "$1")
      .replace(WIKI_LINK, (_match, target: string, alias?: string) => {
        if (alias) {
          return alias;
        }
        return (
          target.split("/").at(-1)?.replace(MARKDOWN_FILENAME, "") ?? target
        );
      })
      .replace(MARKDOWN_TAG, "")
      .replace(INLINE_FORMAT, "$2")
      .replace(MARKDOWN_ESCAPE, "$1")
      .replace(TRAILING_ESCAPE, "")
      .replace(TRAILING_SPACES, "")
  );
}

export function getVisibleMarkdownLine(
  sourceLine: string,
  kind: MarkdownBlockKind
): string | null {
  let line = sourceLine;

  if (kind === "blockquote") {
    while (BLOCKQUOTE_PREFIX.test(line)) {
      line = line.replace(BLOCKQUOTE_PREFIX, "");
    }
    line = line.replace(LIST_PREFIX, "").replace(TASK_CHECKBOX, "");
  }
  if (kind === "heading") {
    if (SETEXT_HEADING.test(line)) {
      return null;
    }
    line = line.replace(ATX_HEADING_PREFIX, "");
  }
  if (kind === "list") {
    line = line.replace(LIST_PREFIX, "").replace(TASK_CHECKBOX, "").trimStart();
  }
  if (kind === "table") {
    return null;
  }
  if (kind === "code") {
    return FENCE_LINE.test(line) ? null : line.trim();
  }

  return stripInlineMarkdown(line).trim();
}

export function normalizeReadingText(value: string): string {
  return value.replace(READING_WHITESPACE, " ").trim();
}

interface TextPosition {
  node: Text;
  offset: number;
}

interface NormalizedTextMap {
  positions: TextPosition[];
  text: string;
}

const normalizedTextMaps = new WeakMap<HTMLElement, NormalizedTextMap>();

export function invalidateRenderedTextMap(root: HTMLElement) {
  normalizedTextMaps.delete(root);
}

function getNormalizedTextMap(root: HTMLElement): NormalizedTextMap {
  const cached = normalizedTextMaps.get(root);
  if (cached) {
    return cached;
  }
  const walker = root.ownerDocument.createTreeWalker(root, 4);
  const positions: TextPosition[] = [];
  let text = "";
  let previousWasSpace = true;
  let currentNode = walker.nextNode();
  while (currentNode) {
    const node = currentNode as Text;
    for (let offset = 0; offset < node.data.length; offset += 1) {
      const character = node.data[offset];
      if (WHITESPACE.test(character)) {
        if (!previousWasSpace) {
          text += " ";
          positions.push({ node, offset });
          previousWasSpace = true;
        }
      } else {
        text += character;
        positions.push({ node, offset });
        previousWasSpace = false;
      }
    }
    currentNode = walker.nextNode();
  }
  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    positions.pop();
  }
  const result = { positions, text };
  normalizedTextMaps.set(root, result);
  return result;
}

function getSourceLines(source: string): string[] {
  return source.replace(SOURCE_NEWLINES, "\n").split("\n");
}

function groupRectFragments(
  fragments: DOMRectList | DOMRect[]
): Array<{ top: number; height: number }> {
  const sorted = Array.from(fragments)
    .filter((rect) => rect.height > 0 && rect.width > 0)
    .sort((left, right) => left.top - right.top || left.left - right.left);
  const rows: Array<{ top: number; bottom: number }> = [];
  for (const rect of sorted) {
    const row = rows.at(-1);
    if (row && Math.abs(row.top - rect.top) <= 2) {
      row.top = Math.min(row.top, rect.top);
      row.bottom = Math.max(row.bottom, rect.bottom);
    } else {
      rows.push({ top: rect.top, bottom: rect.bottom });
    }
  }
  return rows.map((row) => ({ top: row.top, height: row.bottom - row.top }));
}

export function getRenderedLineRects(
  root: HTMLElement,
  source: string,
  lineNumber: number,
  sectionStart: number,
  kind: MarkdownBlockKind
): Array<{ top: number; height: number }> | null {
  const lines = getSourceLines(source);
  const needle = normalizeReadingText(
    getVisibleMarkdownLine(lines[lineNumber] ?? "", kind) ?? ""
  );
  if (!needle) {
    return null;
  }

  const textMap = getNormalizedTextMap(root);
  const matchIndex = findRenderedSourceLineStart(
    lines,
    lineNumber,
    sectionStart,
    kind,
    textMap.text
  );
  const start = textMap.positions[matchIndex];
  const end = textMap.positions[matchIndex + needle.length - 1];
  if (!(start && end)) {
    return null;
  }

  const range = root.ownerDocument.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset + 1);
  const rects = groupRectFragments(range.getClientRects());
  return rects.length > 0 ? rects : null;
}

function getEnclosingMatch(
  sourceLine: string,
  pattern: RegExp,
  column: number
): RegExpExecArray | null {
  for (const match of sourceLine.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (column > start && column < start + match[0].length) {
      return match;
    }
  }
  return null;
}

function getLinkPrefixAtColumn(
  sourceLine: string,
  column: number
): string | null {
  const link = getEnclosingMatch(sourceLine, IMAGE_OR_LINK, column);
  const referenceLink = link
    ? null
    : getEnclosingMatch(sourceLine, REFERENCE_LINK, column);
  const match = link ?? referenceLink;
  if (!match) {
    return null;
  }
  const start = match.index ?? 0;
  const label = match[1] ?? "";
  const labelStart = start + match[0].indexOf(label);
  return (
    sourceLine.slice(0, start) +
    label.slice(0, Math.max(0, column - labelStart))
  );
}

function getWikiLinkPrefixAtColumn(
  sourceLine: string,
  column: number
): string | null {
  const match = getEnclosingMatch(sourceLine, WIKI_LINK, column);
  if (!match) {
    return null;
  }
  const start = match.index ?? 0;
  const target = match[1] ?? "";
  const alias = match[2];
  const targetStart = start + match[0].indexOf(target);
  if (alias) {
    const aliasStart = start + match[0].lastIndexOf(alias);
    return (
      sourceLine.slice(0, start) +
      (column > aliasStart
        ? alias.slice(0, Math.max(0, column - aliasStart))
        : "")
    );
  }
  const basename =
    target.split("/").at(-1)?.replace(MARKDOWN_FILENAME, "") ?? target;
  const basenameStart = targetStart + target.length - basename.length;
  return (
    sourceLine.slice(0, start) +
    (column > basenameStart
      ? basename.slice(0, Math.max(0, column - basenameStart))
      : "")
  );
}

function getInlineFormatPrefixAtColumn(
  sourceLine: string,
  column: number
): string | null {
  const match = getEnclosingMatch(sourceLine, INLINE_FORMAT, column);
  if (!match) {
    return null;
  }
  const start = match.index ?? 0;
  const content = match[2] ?? "";
  const contentStart = start + (match[1]?.length ?? 0);
  return (
    sourceLine.slice(0, start) +
    (column > contentStart
      ? content.slice(0, Math.max(0, column - contentStart))
      : "")
  );
}

function getVisiblePrefixAtColumn(
  sourceLine: string,
  column: number,
  kind: MarkdownBlockKind
): string {
  const tag = getEnclosingMatch(sourceLine, MARKDOWN_TAG, column);
  const entity = getEnclosingMatch(sourceLine, MARKDOWN_ENTITY, column);
  const prefix =
    getLinkPrefixAtColumn(sourceLine, column) ??
    getWikiLinkPrefixAtColumn(sourceLine, column) ??
    (tag ? sourceLine.slice(0, tag.index ?? 0) : null) ??
    getInlineFormatPrefixAtColumn(sourceLine, column) ??
    (entity
      ? sourceLine.slice(0, entity.index ?? 0) + decodeEntities(entity[0])
      : sourceLine.slice(0, column));

  return normalizeReadingText(getVisibleMarkdownLine(prefix, kind) ?? "");
}

export function getRenderedLineRect(
  root: HTMLElement,
  source: string,
  lineNumber: number,
  sourceColumn: number,
  sectionStart: number,
  kind: MarkdownBlockKind
): { top: number; height: number } | null {
  const sourceLines = getSourceLines(source);
  const sourceLine = sourceLines[lineNumber];
  const visibleLine = normalizeReadingText(
    getVisibleMarkdownLine(sourceLine ?? "", kind) ?? ""
  );
  if (!visibleLine) {
    return null;
  }

  const textMap = getNormalizedTextMap(root);
  const lineStart = findRenderedSourceLineStart(
    sourceLines,
    lineNumber,
    sectionStart,
    kind,
    textMap.text
  );
  if (lineStart < 0) {
    return null;
  }

  const visibleColumn = Math.min(
    visibleLine.length - 1,
    getVisiblePrefixAtColumn(
      sourceLine ?? "",
      Math.max(0, Math.min(sourceLine?.length ?? 0, sourceColumn)),
      kind
    ).length
  );
  const position = textMap.positions[lineStart + visibleColumn];
  if (!position) {
    return null;
  }

  const range = root.ownerDocument.createRange();
  range.setStart(position.node, position.offset);
  range.setEnd(position.node, position.offset + 1);
  const rect = Array.from(range.getClientRects()).find(
    (candidate) => candidate.height > 0 && candidate.width > 0
  );
  return rect ? { top: rect.top, height: rect.height } : null;
}

export function getRenderedSourceLineStart(
  source: string,
  lineNumber: number,
  sectionStart: number,
  kind: MarkdownBlockKind,
  renderedText: string
): number {
  return findRenderedSourceLineStart(
    getSourceLines(source),
    lineNumber,
    sectionStart,
    kind,
    renderedText
  );
}

function findRenderedSourceLineStart(
  lines: string[],
  lineNumber: number,
  sectionStart: number,
  kind: MarkdownBlockKind,
  renderedText: string
): number {
  let searchFrom = 0;
  for (let index = sectionStart; index <= lineNumber; index += 1) {
    const visibleLine = normalizeReadingText(
      getVisibleMarkdownLine(lines[index] ?? "", kind) ?? ""
    );
    if (!visibleLine) {
      continue;
    }
    const found = renderedText.indexOf(visibleLine, searchFrom);
    if (found < 0) {
      break;
    }
    if (index === lineNumber) {
      return found;
    }
    searchFrom = found + visibleLine.length;
  }
  const currentLine = normalizeReadingText(
    getVisibleMarkdownLine(lines[lineNumber] ?? "", kind) ?? ""
  );
  return currentLine ? renderedText.indexOf(currentLine) : -1;
}

export function getTableRenderedRowIndex(
  source: string,
  lineNumber: number,
  blockStart: number
): number | null {
  const lines = getSourceLines(source);
  const currentLine = lines[lineNumber] ?? "";
  if (!TABLE_ROW.test(currentLine)) {
    return null;
  }
  let rowIndex = 0;
  for (let index = blockStart; index < lineNumber; index += 1) {
    if (
      TABLE_ROW.test(lines[index] ?? "") &&
      !TABLE_SEPARATOR.test(lines[index] ?? "")
    ) {
      rowIndex += 1;
    }
  }
  if (TABLE_SEPARATOR.test(currentLine)) {
    return Math.max(0, rowIndex - 1);
  }
  return rowIndex;
}
