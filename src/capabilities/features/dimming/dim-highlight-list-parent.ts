import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class DimHighlightListParent extends FeatureToggle {
  readonly settingKey = "dimming.isDimHighlightListParentEnabled" as const;
  protected override toggleClass = "ptm-dim-highlight-list-parent";
  protected settingTitle = "高亮列表父项";
  protected settingDesc = "开启后，不淡化当前列表项的父级列表项";
}
