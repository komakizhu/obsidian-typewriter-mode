import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";
import type HemingwayMode from "./hemingway-mode";

export default class HemingwayModeStatusBarText extends Feature {
  readonly settingKey = "hemingwayMode.hemingwayModeStatusBarText" as const;
  protected settingTitle = "状态栏文本";
  protected settingDesc = "海明威模式启用时在状态栏显示的文本。";

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: this.settingTitle,
      desc: this.settingDesc,
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addText((text) =>
          text
            .setValue(this.getSettingValue() as string)
            .onChange((newValue) => {
              this.setSettingValue(newValue);
              this.tm.saveSettings().catch((error) => {
                console.error("Failed to save settings:", error);
              });
              this.updateHemingwayModeStatusBar();
              onChanged?.();
            })
        );
      },
    };
  }

  registerSetting(settingGroup: SettingGroup) {
    settingGroup.addSetting((setting) => {
      setting
        .setName(this.settingTitle)
        .setDesc(this.settingDesc)
        .setClass("typewriter-mode-setting")
        .addText((text) =>
          text
            .setValue(this.getSettingValue() as string)
            .onChange((newValue) => {
              this.setSettingValue(newValue);
              this.tm.saveSettings().catch((error) => {
                console.error("Failed to save settings:", error);
              });
              this.updateHemingwayModeStatusBar();
            })
        );
    });
  }

  private updateHemingwayModeStatusBar() {
    const hemingwayMode = this.tm.features.hemingwayMode[
      "hemingwayMode.isHemingwayModeEnabled"
    ] as HemingwayMode;
    hemingwayMode.updateStatusBarText();
  }
}
