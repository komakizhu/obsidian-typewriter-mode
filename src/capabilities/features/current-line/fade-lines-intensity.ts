import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";

export default class FadeLinesIntensity extends Feature {
  readonly settingKey = "currentLine.fadeLinesIntensity" as const;

  registerSetting(settingGroup: SettingGroup): void {
    settingGroup.addSetting((setting) => {
      setting
        .setName("渐变淡化强度")
        .setDesc("控制行文本淡出的速度")
        .setClass("typewriter-mode-setting")
        .addSlider((slider) =>
          slider
            .setLimits(0, 100, 5)
            .setDynamicTooltip()
            .setValue((this.getSettingValue() as number) * 100)
            .onChange((newValue) => {
              this.changeFadeLinesIntensity(newValue / 100);
            })
        );
    });
  }

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: "渐变淡化强度",
      desc: "控制行文本淡出的速度",
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addSlider((slider) =>
          slider
            .setLimits(0, 100, 5)
            .setDynamicTooltip()
            .setValue((this.getSettingValue() as number) * 100)
            .onChange((newValue) => {
              this.changeFadeLinesIntensity(newValue / 100);
              onChanged?.();
            })
        );
      },
    };
  }

  override load() {
    this.tm.setCSSVariable(
      "--ptm-fade-lines-intensity",
      `${(this.getSettingValue() as number) * 100}%`
    );
  }

  private changeFadeLinesIntensity(newValue = 0.5) {
    this.setSettingValue(newValue);
    this.tm.setCSSVariable("--ptm-fade-lines-intensity", `${newValue * 100}%`);
    this.tm.saveSettings().catch((error) => {
      console.error("Failed to save settings:", error);
    });
  }
}
