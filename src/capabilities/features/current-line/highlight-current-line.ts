import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class HighlightCurrentLine extends FeatureToggle {
  readonly settingKey = "currentLine.isHighlightCurrentLineEnabled" as const;
  protected override toggleClass = "ptm-highlight-current-line";
  protected settingTitle = "高亮当前行";
  protected settingDesc = "高亮光标所在的当前行";
}
