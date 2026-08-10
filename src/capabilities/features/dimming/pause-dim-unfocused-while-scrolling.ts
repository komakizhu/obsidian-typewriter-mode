import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class PauseDimUnfocusedParagraphsWhileScrolling extends FeatureToggle {
  readonly settingKey =
    "dimming.isPauseDimUnfocusedWhileScrollingEnabled" as const;
  protected override toggleClass = "ptm-dim-unfocused-pause-while-scrolling";
  protected settingTitle = "滚动时暂停淡化";
  protected settingDesc = "开启后，滚动时不会淡化段落或句子";
}
