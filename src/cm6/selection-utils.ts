export interface SavedSelection {
  anchor: number;
  head: number;
}

export function normalizeSelectionRange(
  value: unknown,
  documentLength: number
): SavedSelection | null {
  if (!Number.isInteger(documentLength) || documentLength < 0) {
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<SavedSelection>;
  if (
    !(Number.isInteger(candidate.anchor) && Number.isInteger(candidate.head))
  ) {
    return null;
  }

  const anchor = candidate.anchor as number;
  const head = candidate.head as number;
  const clamp = (position: number) =>
    Math.max(0, Math.min(documentLength, position));
  return {
    anchor: clamp(anchor),
    head: clamp(head),
  };
}
