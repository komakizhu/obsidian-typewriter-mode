import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class HighlightLastBlockInReadingMode extends FeatureToggle {
  readonly settingKey =
    "currentLine.isHighlightLastBlockInReadingModeEnabled" as const;
  protected override toggleClass = "ptm-highlight-last-block-in-reading-mode";
  protected settingTitle = "阅读模式高亮最后编辑内容";
  protected settingDesc = "在阅读模式中高亮最后编辑位置所在的内容块。";

  override enable() {
    super.enable();
    this.tm.readingModeHighlight.refresh();
  }

  override disable() {
    super.disable();
    this.tm.readingModeHighlight.clearHighlights();
  }
}
