import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class FadeLinesOnlyInWritingFocusMode extends FeatureToggle {
  readonly settingKey =
    "currentLine.isFadeLinesOnlyInWritingFocusModeEnabled" as const;
  protected override toggleClass = "ptm-fade-lines-only-in-writing-focus-mode";
  protected hasCommand = false;
  protected settingTitle = "仅在写作专注中淡化行";
  protected settingDesc = "仅当写作专注模式启用时显示渐变淡化效果";
}
