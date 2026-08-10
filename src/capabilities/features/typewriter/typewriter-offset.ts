import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";

export default class TypewriterOffset extends Feature {
  readonly settingKey = "typewriter.typewriterOffset" as const;

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: "打字机偏移位置",
      desc: "将打字机当前行定位在屏幕指定百分比的位置",
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addSlider((slider) =>
          slider
            .setLimits(0, 100, 5)
            .setDynamicTooltip()
            .setValue((this.getSettingValue() as number) * 100)
            .onChange((newValue) => {
              this.changeTypewriterOffset(newValue / 100);
              onChanged?.();
            })
        );
      },
    };
  }

  registerSetting(settingGroup: SettingGroup): void {
    settingGroup.addSetting((setting) => {
      setting
        .setName("打字机偏移位置")
        .setDesc("将打字机当前行定位在屏幕指定百分比的位置")
        .setClass("typewriter-mode-setting")
        .addSlider((slider) =>
          slider
            .setLimits(0, 100, 5)
            .setDynamicTooltip()
            .setValue((this.getSettingValue() as number) * 100)
            .onChange((newValue) => {
              this.changeTypewriterOffset(newValue / 100);
            })
        );
    });
  }

  private changeTypewriterOffset(newValue: number) {
    this.setSettingValue(newValue);
    this.tm.saveSettings().catch((error) => {
      console.error("Failed to save settings:", error);
    });
  }
}
