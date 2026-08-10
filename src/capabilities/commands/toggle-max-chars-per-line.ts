import type { FeatureToggle } from "../base/feature-toggle";
import { ToggleCommand } from "../base/toggle-command";

export class ToggleMaxCharsPerLine extends ToggleCommand {
  readonly commandKey = "max-chars-per-line";
  readonly commandTitle = "限制每行最大字符数";
  protected featureToggle = this.tm.features.maxChar[
    "maxChars.isMaxCharsPerLineEnabled"
  ] as FeatureToggle;
}
