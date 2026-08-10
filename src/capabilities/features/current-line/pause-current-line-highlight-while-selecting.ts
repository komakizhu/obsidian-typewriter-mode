import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class PauseCurrentLineHighlightWhileSelecting extends FeatureToggle {
  readonly settingKey =
    "currentLine.isPauseCurrentLineHighlightWhileSelectingEnabled" as const;
  protected override toggleClass = "ptm-current-line-pause-while-selecting";
  protected settingTitle = "选中文本时暂停当前行高亮";
  protected settingDesc = "开启后，选中文本时隐藏当前行高亮";
}
