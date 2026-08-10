import type { FeatureToggle } from "../base/feature-toggle";
import { ToggleCommand } from "../base/toggle-command";

export class TogglePlugin extends ToggleCommand {
  readonly commandKey = "typewriter-mode-plugin";
  readonly commandTitle = "打字机模式插件";
  protected override featureToggle = this.tm.features.general[
    "general.isPluginActivated"
  ] as FeatureToggle;
}
