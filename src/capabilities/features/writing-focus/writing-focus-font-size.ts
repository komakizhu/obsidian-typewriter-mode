import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";

export default class WritingFocusFontSize extends Feature {
  readonly settingKey = "writingFocus.writingFocusFontSize" as const;

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: "写作专注字体大小",
      desc: "写作专注模式下的自定义字体大小（0 = 使用默认字体大小）",
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addSlider((slider) =>
          slider
            .setLimits(0, 36, 1)
            .setDynamicTooltip()
            .setValue(this.getSettingValue() as number)
            .onChange((newValue) => {
              this.changeFontSize(newValue);
              onChanged?.();
            })
        );
      },
    };
  }

  registerSetting(settingGroup: SettingGroup): void {
    settingGroup.addSetting((setting) => {
      setting
        .setName("写作专注字体大小")
        .setDesc("写作专注模式下的自定义字体大小（0 = 使用默认字体大小）")
        .setClass("typewriter-mode-setting")
        .addSlider((slider) =>
          slider
            .setLimits(0, 36, 1)
            .setDynamicTooltip()
            .setValue(this.getSettingValue() as number)
            .onChange((newValue) => {
              this.changeFontSize(newValue);
            })
        );
    });
  }

  override load() {
    const fontSize = this.getSettingValue() as number;
    if (fontSize > 0) {
      this.tm.setCSSVariable("--writing-focus-font-size", `${fontSize}pt`);
    } else {
      this.tm.setCSSVariable("--writing-focus-font-size", "inherit");
    }
  }

  private changeFontSize(newValue: number) {
    this.setSettingValue(newValue);
    if (newValue > 0) {
      this.tm.setCSSVariable("--writing-focus-font-size", `${newValue}pt`);
    } else {
      this.tm.setCSSVariable("--writing-focus-font-size", "inherit");
    }
    this.tm.saveSettings().catch((error) => {
      console.error("Failed to save settings:", error);
    });
  }
}
