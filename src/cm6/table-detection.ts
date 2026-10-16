const fencePattern = /^\s{0,3}(`{3,}|~{3,})/;
const indentedCodePattern = /^(?: {4}|\t)/;
const leadingPipePattern = /^\|/;
const tableSeparatorCellPattern = /^:?-{3,}:?$/;
const trailingPipePattern = /\|$/;

function isTableRow(text: string | undefined) {
  const trimmed = text?.trim();
  if (!trimmed?.includes("|")) {
    return false;
  }

  const withoutOuterPipes = trimmed
    .replace(leadingPipePattern, "")
    .replace(trailingPipePattern, "");
  return withoutOuterPipes.split("|").length >= 2;
}

function isTableSeparator(text: string | undefined) {
  const trimmed = text?.trim();
  if (!trimmed?.includes("|")) {
    return false;
  }

  const withoutOuterPipes = trimmed
    .replace(leadingPipePattern, "")
    .replace(trailingPipePattern, "");
  const cells = withoutOuterPipes.split("|").map((cell) => cell.trim());
  return (
    cells.length >= 2 &&
    cells.every((cell) => tableSeparatorCellPattern.test(cell))
  );
}

function isLineInFencedCodeBlock(lines: readonly string[], lineIndex: number) {
  if (indentedCodePattern.test(lines[lineIndex] ?? "")) {
    return true;
  }

  let fence: { character: string; length: number } | null = null;

  for (let index = 0; index <= lineIndex; index += 1) {
    const match = lines[index]?.match(fencePattern);
    if (!match) {
      continue;
    }

    const marker = match[1];
    if (!fence) {
      fence = { character: marker[0], length: marker.length };
      continue;
    }

    if (marker[0] === fence.character && marker.length >= fence.length) {
      fence = null;
    }
  }

  return fence !== null;
}

export function isMarkdownTableBlock(
  lines: readonly string[],
  activeLineNumber: number
) {
  const activeIndex = activeLineNumber - 1;
  if (
    activeIndex < 0 ||
    activeIndex >= lines.length ||
    isLineInFencedCodeBlock(lines, activeIndex)
  ) {
    return false;
  }

  for (let headerIndex = 0; headerIndex <= activeIndex; headerIndex += 1) {
    if (
      !(
        isTableRow(lines[headerIndex]) &&
        isTableSeparator(lines[headerIndex + 1])
      ) ||
      isLineInFencedCodeBlock(lines, headerIndex) ||
      isLineInFencedCodeBlock(lines, headerIndex + 1)
    ) {
      continue;
    }

    let endIndex = headerIndex + 1;
    while (
      endIndex + 1 < lines.length &&
      isTableRow(lines[endIndex + 1]) &&
      !isLineInFencedCodeBlock(lines, endIndex + 1)
    ) {
      endIndex += 1;
    }

    if (activeIndex <= endIndex) {
      return true;
    }
  }

  return false;
}
