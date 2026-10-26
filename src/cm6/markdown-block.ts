export type MarkdownBlockKind =
  | "blockquote"
  | "code"
  | "heading"
  | "list"
  | "paragraph"
  | "table";

export interface MarkdownBlockSpan {
  endLine: number;
  kind: MarkdownBlockKind;
  startLine: number;
}

export interface MarkdownSectionRange {
  lineEnd: number;
  lineStart: number;
}

const LIST_ITEM = /^(\s*)(?:[-+*]|\d+[.)])\s+/;
const QUOTE_LINE = /^ {0,3}>/;
const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const HEADING = /^ {0,3}#{1,6}(?:\s|$)/;
const EMBED = /^\s*!\[\[.*\]\]\s*$/;
const INDENTED_LINE = /^\s{2,}\S/;
const HORIZONTAL_RULE = /^\s*(?:---+|___+|\*\*\*+)\s*$/;
const SETEXT_HEADING = /^\s*(?:=+|-{3,})\s*$/;

function frontmatterEnd(lines: string[]): number {
  if (lines[0]?.trim() !== "---") {
    return 0;
  }
  for (let i = 1; i < lines.length; i += 1) {
    if (["---", "..."].includes(lines[i].trim())) {
      return i + 1;
    }
  }
  return 0;
}

function getFenceSpan(lines: string[], line: number): MarkdownBlockSpan | null {
  let opening: { line: number; marker: string; length: number } | null = null;
  for (let i = 0; i <= line; i += 1) {
    const match = lines[i].match(FENCE_LINE);
    if (!match) {
      continue;
    }
    if (!opening) {
      opening = { line: i, marker: match[1][0], length: match[1].length };
    } else if (
      match[1][0] === opening.marker &&
      match[1].length >= opening.length
    ) {
      opening = null;
    }
  }
  if (!opening) {
    return null;
  }
  let endLine = lines.length;
  for (let i = line + 1; i < lines.length; i += 1) {
    const match = lines[i].match(FENCE_LINE);
    if (
      match &&
      match[1][0] === opening.marker &&
      match[1].length >= opening.length
    ) {
      endLine = i + 1;
      break;
    }
  }
  return { kind: "code", startLine: opening.line, endLine };
}

function findListItemLine(lines: string[], line: number): number {
  const marker = lines[line].match(LIST_ITEM);
  if (marker) {
    return line;
  }
  for (let i = line - 1; i >= 0; i -= 1) {
    if (!lines[i].trim()) {
      break;
    }
    const candidate = lines[i].match(LIST_ITEM);
    if (candidate && lines[line].startsWith(`${candidate[1]}  `)) {
      return i;
    }
    if (!(candidate || INDENTED_LINE.test(lines[i]))) {
      break;
    }
  }
  return -1;
}

function findListStart(
  lines: string[],
  itemLine: number
): { rootIndent: number; startLine: number } {
  const itemIndent = lines[itemLine].match(LIST_ITEM)?.[1].length ?? 0;
  let startLine = itemLine;
  let rootIndent = itemIndent;
  for (let i = itemLine - 1; i >= 0; i -= 1) {
    const previous = lines[i];
    if (!previous.trim()) {
      const before = i > 0 ? lines[i - 1].match(LIST_ITEM) : null;
      const after = lines[i + 1]?.match(LIST_ITEM);
      if (before && after && before[1].length === after[1].length) {
        startLine = i - 1;
        rootIndent = Math.min(rootIndent, before[1].length);
        i -= 1;
        continue;
      }
      break;
    }
    const previousItem = previous.match(LIST_ITEM);
    if (previousItem) {
      startLine = i;
      rootIndent = Math.min(rootIndent, previousItem[1].length);
      continue;
    }
    if (INDENTED_LINE.test(previous)) {
      startLine = i;
      continue;
    }
    break;
  }

  return { rootIndent, startLine };
}

function findListEnd(
  lines: string[],
  line: number,
  rootIndent: number
): number {
  let endLine = line + 1;
  for (let i = line + 1; i < lines.length; i += 1) {
    const current = lines[i];
    if (!current.trim()) {
      const nextItem = lines[i + 1]?.match(LIST_ITEM);
      if (nextItem && nextItem[1].length === rootIndent) {
        endLine = i + 2;
        i += 1;
        continue;
      }
      break;
    }
    const nextItem = current.match(LIST_ITEM);
    if (nextItem) {
      if (nextItem[1].length < rootIndent) {
        break;
      }
      endLine = i + 1;
      continue;
    }
    if (INDENTED_LINE.test(current)) {
      endLine = i + 1;
      continue;
    }
    break;
  }
  return endLine;
}

function getListSpan(lines: string[], line: number): MarkdownBlockSpan | null {
  const itemLine = findListItemLine(lines, line);
  if (itemLine < 0) {
    return null;
  }
  const { rootIndent, startLine } = findListStart(lines, itemLine);
  return {
    kind: "list",
    startLine,
    endLine: findListEnd(lines, line, rootIndent),
  };
}

function getTableSpan(lines: string[], line: number): MarkdownBlockSpan | null {
  let startLine = line;
  let endLine = line + 1;
  while (startLine > 0 && TABLE_ROW.test(lines[startLine - 1])) {
    startLine -= 1;
  }
  while (endLine < lines.length && TABLE_ROW.test(lines[endLine])) {
    endLine += 1;
  }
  if (
    endLine - startLine < 2 ||
    !lines.slice(startLine, endLine).some((row) => TABLE_SEPARATOR.test(row))
  ) {
    return null;
  }
  return { kind: "table", startLine, endLine };
}

function isOtherBlockStart(line: string): boolean {
  return (
    HEADING.test(line) ||
    FENCE_LINE.test(line) ||
    QUOTE_LINE.test(line) ||
    LIST_ITEM.test(line) ||
    TABLE_ROW.test(line) ||
    HORIZONTAL_RULE.test(line) ||
    EMBED.test(line)
  );
}

function getBlockquoteSpan(
  lines: string[],
  line: number
): MarkdownBlockSpan | null {
  if (!QUOTE_LINE.test(lines[line])) {
    return null;
  }
  let startLine = line;
  let endLine = line + 1;
  while (startLine > 0) {
    if (!QUOTE_LINE.test(lines[startLine - 1])) {
      break;
    }
    startLine -= 1;
  }
  while (endLine < lines.length) {
    if (!QUOTE_LINE.test(lines[endLine])) {
      break;
    }
    endLine += 1;
  }
  return { kind: "blockquote", startLine, endLine };
}

function getHeadingSpan(
  lines: string[],
  line: number
): MarkdownBlockSpan | null {
  if (HEADING.test(lines[line])) {
    return { kind: "heading", startLine: line, endLine: line + 1 };
  }
  if (line + 1 < lines.length && SETEXT_HEADING.test(lines[line + 1])) {
    return { kind: "heading", startLine: line, endLine: line + 2 };
  }
  if (line > 0 && SETEXT_HEADING.test(lines[line])) {
    return { kind: "heading", startLine: line - 1, endLine: line + 1 };
  }
  return null;
}

function getParagraphSpan(lines: string[], line: number): MarkdownBlockSpan {
  let startLine = line;
  let endLine = line + 1;
  while (
    startLine > 0 &&
    lines[startLine - 1].trim() &&
    !isOtherBlockStart(lines[startLine - 1])
  ) {
    startLine -= 1;
  }
  while (
    endLine < lines.length &&
    lines[endLine].trim() &&
    !isOtherBlockStart(lines[endLine])
  ) {
    endLine += 1;
  }
  return { kind: "paragraph", startLine, endLine };
}

export function getMarkdownBlockAtLine(
  markdown: string,
  line: number
): MarkdownBlockSpan | null {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  if (
    !Number.isInteger(line) ||
    line < 0 ||
    line >= lines.length ||
    line < frontmatterEnd(lines) ||
    !lines[line].trim() ||
    EMBED.test(lines[line])
  ) {
    return null;
  }

  return (
    getFenceSpan(lines, line) ??
    getBlockquoteSpan(lines, line) ??
    getTableSpan(lines, line) ??
    getListSpan(lines, line) ??
    getHeadingSpan(lines, line) ??
    getParagraphSpan(lines, line)
  );
}

export function sectionMatchesBlock(
  section: MarkdownSectionRange | null,
  block: MarkdownBlockSpan | null
): boolean {
  if (!(section && block) || section.lineStart !== block.startLine) {
    return false;
  }
  return (
    section.lineEnd === block.endLine || section.lineEnd === block.endLine - 1
  );
}

export function sourceBlockMatches(
  renderedSource: string,
  currentSource: string,
  block: MarkdownBlockSpan | null
): boolean {
  if (!block) {
    return false;
  }
  const renderedLines = renderedSource.replace(/\r\n?/g, "\n").split("\n");
  const currentLines = currentSource.replace(/\r\n?/g, "\n").split("\n");
  if (
    block.startLine < 0 ||
    block.endLine > renderedLines.length ||
    block.endLine > currentLines.length
  ) {
    return false;
  }
  return (
    renderedLines.slice(block.startLine, block.endLine).join("\n") ===
    currentLines.slice(block.startLine, block.endLine).join("\n")
  );
}
