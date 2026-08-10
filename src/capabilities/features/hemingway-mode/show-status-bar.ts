import { FeatureToggle } from "@/capabilities/base/feature-toggle";
import type HemingwayMode from "./hemingway-mode";

export default class ShowHemingwayModeStatusBar extends FeatureToggle {
  readonly settingKey =
    "hemingwayMode.isShowHemingwayModeStatusBarEnabled" as const;
  protected override toggleClass = null;
  protected settingTitle = "显示状态栏指示器";
  protected settingDesc = "海明威模式启用时在状态栏显示指示器。";

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
