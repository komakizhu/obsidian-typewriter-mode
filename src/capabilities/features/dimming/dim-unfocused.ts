import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class DimUnfocused extends FeatureToggle {
  readonly settingKey = "dimming.isDimUnfocusedEnabled" as const;
  protected override toggleClass = "ptm-dim-unfocused";
  protected settingTitle = "淡化非焦点内容";
  protected settingDesc = "淡化非焦点段落或句子";
}
