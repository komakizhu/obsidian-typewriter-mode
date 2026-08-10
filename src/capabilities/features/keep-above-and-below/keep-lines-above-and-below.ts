import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class KeepLinesAboveAndBelow extends FeatureToggle {
  readonly settingKey =
    "keepLinesAboveAndBelow.isKeepLinesAboveAndBelowEnabled" as const;
  protected settingTitle = "保持当前行上下行数";
  protected settingDesc =
    "开启后，始终在视图中保留当前行上方和下方指定数量的行";

  protected override isSettingEnabled(): boolean {
    return !this.tm.settings.typewriter.isTypewriterScrollEnabled;
  }
}
