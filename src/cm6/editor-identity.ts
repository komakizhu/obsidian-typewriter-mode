export interface EditorInfoLike {
  editor?: unknown;
  file?: { path?: string } | null;
}

export function getEditorFilePath(
  info: EditorInfoLike | null | undefined
): string | null {
  const path = info?.file?.path;
  return typeof path === "string" && path.length > 0 ? path : null;
}
