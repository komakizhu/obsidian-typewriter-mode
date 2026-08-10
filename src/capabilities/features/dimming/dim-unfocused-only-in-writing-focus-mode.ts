import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class DimUnfocusedOnlyInWritingFocusMode extends FeatureToggle {
  readonly settingKey =
    "dimming.isDimUnfocusedOnlyInWritingFocusModeEnabled" as const;
  protected override toggleClass =
    "ptm-dim-unfocused-only-in-writing-focus-mode";
  protected hasCommand = false;
  protected settingTitle = "仅在写作专注中淡化非焦点内容";
  protected settingDesc = "仅当写作专注模式启用时淡化非焦点段落或句子";
}
