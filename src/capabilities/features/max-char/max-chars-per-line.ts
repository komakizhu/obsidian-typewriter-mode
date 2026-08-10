import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";

export default class MaxCharsPerLine extends Feature {
  readonly settingKey = "maxChars.maxCharsPerLine" as const;

  registerSetting(settingGroup: SettingGroup): void {
    settingGroup.addSetting((setting) => {
      setting
        .setName("每行最大字符数")
        .setDesc("每行最多显示的字符数")
        .setClass("typewriter-mode-setting")
        .addText((text) =>
          text
            .setValue((this.getSettingValue() as number).toString())
            .onChange((newValue) => {
              this.changeMaxCharsPerLine(Number.parseInt(newValue, 10));
            })
        );
    });
  }

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: "每行最大字符数",
      desc: "每行最多显示的字符数",
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addText((text) =>
          text
            .setValue((this.getSettingValue() as number).toString())
            .onChange((newValue) => {
              this.changeMaxCharsPerLine(Number.parseInt(newValue, 10));
              onChanged?.();
            })
        );
      },
    };
  }

  override load() {
    this.tm.setCSSVariable(
      "--max-chars-per-line",
      `${this.getSettingValue()}ch`
    );
  }

  private changeMaxCharsPerLine(newValue: number) {
    this.setSettingValue(newValue);
    this.tm.setCSSVariable("--max-chars-per-line", `${newValue}ch`);
    this.tm.saveSettings().catch((error) => {
      console.error("Failed to save settings:", error);
    });
  }
}
