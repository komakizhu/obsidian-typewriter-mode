import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class PauseCurrentLineHighlightWhileScrolling extends FeatureToggle {
  readonly settingKey =
    "currentLine.isPauseCurrentLineHighlightWhileScrollingEnabled" as const;
  protected override toggleClass = "ptm-current-line-pause-while-scrolling";
  protected settingTitle = "滚动时暂停当前行高亮";
  protected settingDesc = "开启后，滚动时隐藏当前行高亮";
}
