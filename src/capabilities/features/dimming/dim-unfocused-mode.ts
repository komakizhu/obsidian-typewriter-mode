import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";
import {
  DIM_UNFOCUSED_MODE,
  type DimUnfocusedMode as DimUnfocusedModeType,
} from "@/capabilities/constants";

export default class DimUnfocusedMode extends Feature {
  readonly settingKey = "dimming.dimUnfocusedMode" as const;

  registerSetting(settingGroup: SettingGroup): void {
    settingGroup.addSetting((setting) => {
      setting
        .setName("非焦点淡化模式")
        .setDesc("选择淡化非焦点段落或句子")
        .setClass("typewriter-mode-setting")
        .addDropdown((dropdown) =>
          dropdown
            .addOption(DIM_UNFOCUSED_MODE.PARAGRAPHS, "段落")
            .addOption(DIM_UNFOCUSED_MODE.SENTENCES, "句子")
            .setValue(this.getSettingValue() as DimUnfocusedModeType)
            .onChange((newValue) => {
              this.change(newValue as DimUnfocusedModeType);
            })
        );
    });
  }

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: "非焦点淡化模式",
      desc: "选择淡化非焦点段落或句子",
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addDropdown((dropdown) =>
          dropdown
            .addOption(DIM_UNFOCUSED_MODE.PARAGRAPHS, "段落")
            .addOption(DIM_UNFOCUSED_MODE.SENTENCES, "句子")
            .setValue(this.getSettingValue() as DimUnfocusedModeType)
            .onChange((newValue) => {
              this.change(newValue as DimUnfocusedModeType);
              onChanged?.();
            })
        );
      },
    };
  }

  override load() {
    super.load();
    this.tm.perWindowProps.bodyAttrs["data-ptm-dim-unfocused-mode"] =
      this.getSettingValue() as DimUnfocusedModeType;
  }

  private change(newValue: DimUnfocusedModeType) {
    this.setSettingValue(newValue);
    this.tm.perWindowProps.bodyAttrs["data-ptm-dim-unfocused-mode"] = newValue;
    this.tm.saveSettings().catch((error) => {
      console.error("Failed to save settings:", error);
    });
  }
}
