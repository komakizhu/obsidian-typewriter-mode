import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";
import {
  ENABLED_PLATFORMS,
  type EnabledPlatforms as EnabledPlatformsType,
} from "@/capabilities/constants";

export default class EnabledPlatforms extends Feature {
  readonly settingKey = "general.enabledPlatforms" as const;
  protected settingTitle = "启用平台";
  protected settingDesc = "选择在哪些平台启用打字机模式";

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: this.settingTitle,
      desc: this.settingDesc,
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addDropdown((dropdown) =>
          dropdown
            .addOption(ENABLED_PLATFORMS.BOTH, "所有平台")
            .addOption(ENABLED_PLATFORMS.DESKTOP, "仅桌面端")
            .addOption(ENABLED_PLATFORMS.MOBILE, "仅移动端（平板和手机）")
            .addOption(ENABLED_PLATFORMS.TABLET, "仅平板端")
            .addOption(ENABLED_PLATFORMS.PHONE, "仅手机端")
            .addOption(ENABLED_PLATFORMS.DESKTOP_AND_TABLET, "桌面端和平板端")
            .setValue(this.getSettingValue() as EnabledPlatformsType)
            .onChange((newValue) => {
              this.setSettingValue(newValue as EnabledPlatformsType);
              this.tm.saveSettings().catch((error) => {
                console.error("Failed to save settings:", error);
              });
              onChanged?.();
            })
        );
      },
    };
  }

  registerSetting(settingGroup: SettingGroup): void {
    settingGroup.addSetting((setting) => {
      setting
        .setName(this.settingTitle)
        .setDesc(this.settingDesc)
        .setClass("typewriter-mode-setting")
        .addDropdown((dropdown) =>
          dropdown
            .addOption(ENABLED_PLATFORMS.BOTH, "所有平台")
            .addOption(ENABLED_PLATFORMS.DESKTOP, "仅桌面端")
            .addOption(ENABLED_PLATFORMS.MOBILE, "仅移动端（平板和手机）")
            .addOption(ENABLED_PLATFORMS.TABLET, "仅平板端")
            .addOption(ENABLED_PLATFORMS.PHONE, "仅手机端")
            .addOption(ENABLED_PLATFORMS.DESKTOP_AND_TABLET, "桌面端和平板端")
            .setValue(this.getSettingValue() as EnabledPlatformsType)
            .onChange((newValue) => {
              this.setSettingValue(newValue as EnabledPlatformsType);
              this.tm.saveSettings().catch((error) => {
                console.error("Failed to save settings:", error);
              });
            })
        );
    });
  }
}
