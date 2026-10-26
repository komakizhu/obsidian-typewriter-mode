import type { EditorView } from "@codemirror/view";

export class CurrentLinePositionCalculator {
  protected view: EditorView;

  constructor(view: EditorView) {
    this.view = view;
  }

  getActiveLineProp(prop: string) {
    const valueStr = this.view.contentDOM
      .querySelector(".cm-active.cm-line")
      ?.getCssPropertyValue(prop)
      .replace("px", "");
    if (!valueStr) {
      return null;
    }
    return Number.parseFloat(valueStr);
  }

  getCurrentLinePositionData() {
    const caretCoords = this.view.coordsAtPos(
      this.view.state.selection.main.head
    );
    if (!caretCoords) {
      return null;
    }

    const caretHeight = caretCoords.bottom - caretCoords.top;
    const lineHeightProp = this.getActiveLineProp("line-height");
    if (!lineHeightProp) {
      return null;
    }

    let lineHeight = 0;
    let lineOffset = 0;
    if (caretHeight > lineHeightProp) {
      lineHeight = caretHeight;
      lineOffset = 0;
    } else {
      lineHeight = lineHeightProp;
      lineOffset = (lineHeight - caretHeight) / 2;
    }

    return {
      lineHeight,
      lineOffset,
    };
  }
}

export interface CurrentLinePositionData {
  lineHeight: number;
  lineOffset: number;
}
