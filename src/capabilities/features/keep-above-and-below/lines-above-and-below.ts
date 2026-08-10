import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";

export default class LinesAboveAndBelow extends Feature {
  readonly settingKey = "keepLinesAboveAndBelow.linesAboveAndBelow" as const;

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: "当前行上下保留的行数",
      desc: "始终在当前行上方和下方保留的行数",
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addText((text) =>
          text
            .setValue((this.getSettingValue() as number).toString())
            .onChange((newValue) => {
              this.changeAmountOfLinesAboveAndBelow(
                Number.parseInt(newValue, 10)
              );
              onChanged?.();
            })
        );
      },
    };
  }

  registerSetting(settingGroup: SettingGroup): void {
    settingGroup.addSetting((setting) => {
      setting
        .setName("当前行上下保留的行数")
        .setDesc("始终在当前行上方和下方保留的行数")
        .setClass("typewriter-mode-setting")
        .addText((text) =>
          text
            .setValue((this.getSettingValue() as number).toString())
            .onChange((newValue) => {
              this.changeAmountOfLinesAboveAndBelow(
                Number.parseInt(newValue, 10)
              );
            })
        );
    });
  }

  private changeAmountOfLinesAboveAndBelow(newValue: number) {
    this.setSettingValue(newValue);
    this.tm.saveSettings().catch((error) => {
      console.error("Failed to save settings:", error);
    });
  }
}
