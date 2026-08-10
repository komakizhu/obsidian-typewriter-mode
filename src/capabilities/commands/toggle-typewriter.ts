import type { FeatureToggle } from "../base/feature-toggle";
import { ToggleCommand } from "../base/toggle-command";

export class ToggleTypewriter extends ToggleCommand {
  readonly commandKey = "typewriter";
  readonly commandTitle = "打字机滚动";
  protected override featureToggle = this.tm.features.typewriter[
    "typewriter.isTypewriterScrollEnabled"
  ] as FeatureToggle;
}
