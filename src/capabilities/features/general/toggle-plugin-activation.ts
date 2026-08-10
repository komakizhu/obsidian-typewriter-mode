import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class TogglePluginActivation extends FeatureToggle {
  readonly settingKey = "general.isPluginActivated" as const;
  protected override toggleClass = "ptm-plugin-activated";
  protected settingTitle = "启用打字机模式";
  protected settingDesc = "启用或停用下面的所有功能。";
}
