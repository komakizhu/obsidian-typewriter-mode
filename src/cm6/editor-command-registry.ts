export type TypewriterMoveCommand = "goDown" | "goUp";

export interface EditorCommandTarget {
  moveByCommand(command: TypewriterMoveCommand): void;
}

const targets = new WeakMap<object, EditorCommandTarget>();

export function registerEditorCommandTarget(
  editor: object,
  target: EditorCommandTarget
) {
  targets.set(editor, target);
}

export function unregisterEditorCommandTarget(
  editor: object,
  target: EditorCommandTarget
) {
  if (targets.get(editor) === target) {
    targets.delete(editor);
  }
}

export function dispatchEditorCommand(
  editor: object,
  command: TypewriterMoveCommand
) {
  targets.get(editor)?.moveByCommand(command);
}
