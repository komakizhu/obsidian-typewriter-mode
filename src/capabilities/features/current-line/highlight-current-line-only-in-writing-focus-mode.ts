import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class HighlightCurrentLineOnlyInWritingFocusMode extends FeatureToggle {
  readonly settingKey =
    "currentLine.isHighlightCurrentLineOnlyInWritingFocusModeEnabled" as const;
  protected override toggleClass =
    "ptm-highlight-current-line-only-in-writing-focus-mode";
  protected hasCommand = false;
  protected settingTitle = "仅在写作专注中高亮当前行";
  protected settingDesc = "仅当写作专注模式启用时显示当前行高亮";
}
