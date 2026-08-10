import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class TypewriterScroll extends FeatureToggle {
  readonly settingKey = "typewriter.isTypewriterScrollEnabled" as const;
  protected override toggleClass = "ptm-typewriter-scroll";
  protected settingTitle = "打字机滚动";
  protected settingDesc = "开启或关闭打字机滚动";

  protected override isSettingEnabled(): boolean {
    return !this.tm.settings.keepLinesAboveAndBelow
      .isKeepLinesAboveAndBelowEnabled;
  }
}
