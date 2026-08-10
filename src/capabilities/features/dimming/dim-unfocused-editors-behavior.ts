import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";
import {
  DIM_UNFOCUSED_EDITORS_BEHAVIOR,
  type DimUnfocusedEditorsBehavior as DimUnfocusedEditorsBehaviorType,
} from "@/capabilities/constants";

export default class DimUnfocusedEditorsBehavior extends Feature {
  readonly settingKey = "dimming.dimUnfocusedEditorsBehavior" as const;

  registerSetting(settingGroup: SettingGroup): void {
    settingGroup.addSetting((setting) => {
      setting
        .setName("非焦点笔记中的淡化行为")
        .setDesc(
          "如何淡化光标不在其中的笔记或编辑器中的段落/句子（例如同时打开多个分栏时）"
        )
        .setClass("typewriter-mode-setting")
        .addDropdown((dropdown) =>
          dropdown
            .addOption(DIM_UNFOCUSED_EDITORS_BEHAVIOR.NONE, "不淡化任何内容")
            .addOption(
              DIM_UNFOCUSED_EDITORS_BEHAVIOR.DIM,
              "淡化除上次焦点段落/句子外的所有内容"
            )
            .addOption(DIM_UNFOCUSED_EDITORS_BEHAVIOR.ALL, "淡化所有内容")
            .setValue(this.getSettingValue() as DimUnfocusedEditorsBehaviorType)
            .onChange((newValue) => {
              this.changeDimUnfocusedEditorsBehavior(
                newValue as DimUnfocusedEditorsBehaviorType
              );
            })
        );
    });
  }

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: "非焦点笔记中的淡化行为",
      desc: "如何淡化光标不在其中的笔记或编辑器中的段落/句子（例如同时打开多个分栏时）",
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addDropdown((dropdown) =>
          dropdown
            .addOption(DIM_UNFOCUSED_EDITORS_BEHAVIOR.NONE, "不淡化任何内容")
            .addOption(
              DIM_UNFOCUSED_EDITORS_BEHAVIOR.DIM,
              "淡化除上次焦点段落/句子外的所有内容"
            )
            .addOption(DIM_UNFOCUSED_EDITORS_BEHAVIOR.ALL, "淡化所有内容")
            .setValue(this.getSettingValue() as DimUnfocusedEditorsBehaviorType)
            .onChange((newValue) => {
              this.changeDimUnfocusedEditorsBehavior(
                newValue as DimUnfocusedEditorsBehaviorType
              );
              onChanged?.();
            })
        );
      },
    };
  }

  override load() {
    super.load();
    this.tm.perWindowProps.bodyAttrs[
      "data-ptm-dim-unfocused-editors-behavior"
    ] = this.getSettingValue() as DimUnfocusedEditorsBehaviorType;
  }

  private changeDimUnfocusedEditorsBehavior(
    newValue: DimUnfocusedEditorsBehaviorType
  ) {
    this.setSettingValue(newValue);
    this.tm.perWindowProps.bodyAttrs[
      "data-ptm-dim-unfocused-editors-behavior"
    ] = newValue;
    this.tm.saveSettings().catch((error) => {
      console.error("Failed to save settings:", error);
    });
  }
}
