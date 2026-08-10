import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class LimitMaxCharsPerLine extends FeatureToggle {
  readonly settingKey = "maxChars.isMaxCharsPerLineEnabled" as const;
  protected override toggleClass = "ptm-max-chars-per-line";
  override isToggleClassPersistent = true;
  protected settingTitle = "限制每行最大字符数";
  protected settingDesc = "限制每行最多显示的字符数";
}
