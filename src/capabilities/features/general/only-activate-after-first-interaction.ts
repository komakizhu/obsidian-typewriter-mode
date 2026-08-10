import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class OnlyActivateAfterFirstInteraction extends FeatureToggle {
  readonly settingKey =
    "general.isOnlyActivateAfterFirstInteractionEnabled" as const;
  protected settingTitle = "首次交互后才启用";
  protected settingDesc = "仅在首次与编辑器交互后启用当前行高亮和段落淡化";
}
