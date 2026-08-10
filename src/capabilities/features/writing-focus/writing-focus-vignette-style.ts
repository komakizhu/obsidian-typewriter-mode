import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";
import {
  WRITING_FOCUS_VIGNETTE_STYLE,
  type WritingFocusVignetteStyle as WritingFocusVignetteStyleType,
} from "@/capabilities/constants";

export default class WritingFocusVignetteStyle extends Feature {
  readonly settingKey = "writingFocus.writingFocusVignetteStyle" as const;

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: "写作专注暗角样式",
      desc: "写作专注模式下的暗角样式",
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addDropdown((dropdown) =>
          dropdown
            .addOption(WRITING_FOCUS_VIGNETTE_STYLE.BOX, "方框")
            .addOption(WRITING_FOCUS_VIGNETTE_STYLE.COLUMN, "纵向栏")
            .setValue(this.getSettingValue() as WritingFocusVignetteStyleType)
            .onChange((newValue) => {
              this.changeVignetteStyle(
                newValue as WritingFocusVignetteStyleType
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
        .setName("写作专注暗角样式")
        .setDesc("写作专注模式下的暗角样式")
        .setClass("typewriter-mode-setting")
        .addDropdown((dropdown) =>
          dropdown
            .addOption(WRITING_FOCUS_VIGNETTE_STYLE.BOX, "方框")
            .addOption(WRITING_FOCUS_VIGNETTE_STYLE.COLUMN, "纵向栏")
            .setValue(this.getSettingValue() as WritingFocusVignetteStyleType)
            .onChange((newValue) => {
              this.changeVignetteStyle(
                newValue as WritingFocusVignetteStyleType
              );
            })
        );
    });
  }

  private changeVignetteStyle(newValue: WritingFocusVignetteStyleType) {
    this.setSettingValue(newValue);
    this.tm.saveSettings().catch((error) => {
      console.error("Failed to save settings:", error);
    });
  }
}
