import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class HighlightSideMarginsOnly extends FeatureToggle {
  readonly settingKey =
    "currentLine.isHighlightSideMarginsOnlyEnabled" as const;
  protected override toggleClass = "ptm-highlight-side-margins-only";
  protected settingTitle = "仅高亮正文两侧";
  protected settingDesc =
    "只高亮正文区域以外的左右空白，正文中间保持原样；编辑视图和阅读视图共用此设置。";

  override enable() {
    super.enable();
    this.tm.readingModeHighlight.refresh();
  }

  override disable() {
    super.disable();
    this.tm.readingModeHighlight.refresh();
  }
}
