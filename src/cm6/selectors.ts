import type { EditorView } from "@codemirror/view";

export function getEditorDom(view: EditorView) {
  return view.dom;
}

export function getScrollDom(view: EditorView) {
  return view.scrollDOM;
}
