import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class AnnounceUpdates extends FeatureToggle {
  readonly settingKey = "general.isAnnounceUpdatesEnabled" as const;
  protected override toggleClass = "ptm-announce-updates";
  protected settingTitle = "发布更新通知";
  protected settingDesc = "开启后，每次安装打字机模式新版本时显示版本说明";
}
