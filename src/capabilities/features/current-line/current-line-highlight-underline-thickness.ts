import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";

export default class CurrentLineHighlightUnderlineThickness extends Feature {
  readonly settingKey =
    "currentLine.currentLineHighlightUnderlineThickness" as const;

  registerSetting(settingGroup: SettingGroup): void {
    settingGroup.addSetting((setting) => {
      setting
        .setName("当前行下划线粗细")
        .setDesc("高亮当前行的下划线粗细")
        .setClass("typewriter-mode-setting")
        .addSlider((slider) =>
          slider
            .setLimits(1, 5, 1)
            .setDynamicTooltip()
            .setValue(this.getSettingValue() as number)
            .onChange((newValue) => {
              this.changeCurrentLineHighlightUnderlineThickness(newValue);
            })
        );
    });
  }

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: "当前行下划线粗细",
      desc: "高亮当前行的下划线粗细",
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addSlider((slider) =>
          slider
            .setLimits(1, 5, 1)
            .setDynamicTooltip()
            .setValue(this.getSettingValue() as number)
            .onChange((newValue) => {
              this.changeCurrentLineHighlightUnderlineThickness(newValue);
              onChanged?.();
            })
        );
      },
    };
  }

  override load() {
    this.tm.setCSSVariable(
      "--current-line-highlight-underline-thickness",
      `${this.getSettingValue()}px`
    );
  }

  private changeCurrentLineHighlightUnderlineThickness(newValue: number) {
    this.setSettingValue(newValue);
    this.tm.setCSSVariable(
      "--current-line-highlight-underline-thickness",
      `${newValue}px`
    );
    this.tm.saveSettings().catch((error) => {
      console.error("Failed to save settings:", error);
    });
  }
}
