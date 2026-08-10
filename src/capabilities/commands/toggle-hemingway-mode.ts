import type { FeatureToggle } from "../base/feature-toggle";
import { ToggleCommand } from "../base/toggle-command";

export class ToggleHemingwayMode extends ToggleCommand {
  readonly commandKey = "hemingway-mode";
  readonly commandTitle = "海明威模式";
  protected featureToggle = this.tm.features.hemingwayMode[
    "hemingwayMode.isHemingwayModeEnabled"
  ] as FeatureToggle;
}
