import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class FadeLines extends FeatureToggle {
  readonly settingKey = "currentLine.isFadeLinesEnabled" as const;
  protected override toggleClass = "ptm-fade-lines";
  protected settingTitle = "渐变淡化行";
  protected settingDesc =
    "在当前行上方和下方添加渐变，使编辑器顶部和底部的文本逐渐淡出。";
}
