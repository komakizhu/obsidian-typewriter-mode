import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class PauseDimUnfocusedWhileSelecting extends FeatureToggle {
  readonly settingKey =
    "dimming.isPauseDimUnfocusedWhileSelectingEnabled" as const;
  protected override toggleClass = "ptm-dim-unfocused-pause-while-selecting";
  protected settingTitle = "选中文本时暂停淡化";
  protected settingDesc = "开启后，选中文本时不会淡化段落或句子";
}
