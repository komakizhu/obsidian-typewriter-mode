import { FeatureToggle } from "@/capabilities/base/feature-toggle";
import type HemingwayMode from "./hemingway-mode";

export default class HemingwayModeOnlyInWritingFocusMode extends FeatureToggle {
  readonly settingKey =
    "hemingwayMode.isHemingwayModeOnlyInWritingFocusModeEnabled" as const;
  protected override toggleClass = null;
  protected hasCommand = false;
  protected settingTitle = "仅在写作专注中启用海明威模式";
  protected settingDesc = "仅当写作专注模式启用时执行海明威模式";

  override enable() {
    super.enable();
    this.updateHemingwayModeStatusBar();
  }

  override disable() {
    super.disable();
    this.updateHemingwayModeStatusBar();
  }

  private updateHemingwayModeStatusBar() {
    const hemingwayMode = this.tm.features.hemingwayMode[
      "hemingwayMode.isHemingwayModeEnabled"
    ] as HemingwayMode;
    hemingwayMode.updateStatusBarText();
  }
}
