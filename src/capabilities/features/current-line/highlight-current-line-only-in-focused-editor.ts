import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class HighlightCurrentLineOnlyInFocusedEditor extends FeatureToggle {
  readonly settingKey =
    "currentLine.isHighlightCurrentLineOnlyInFocusedEditorEnabled" as const;
  protected override toggleClass =
    "ptm-highlight-current-line-only-in-active-editor";
  protected hasCommand = false;
  protected settingTitle = "仅在焦点笔记中高亮当前行";
  protected settingDesc =
    "仅在光标所在的笔记中显示当前行高亮（例如同时打开多个分栏时）";
}
