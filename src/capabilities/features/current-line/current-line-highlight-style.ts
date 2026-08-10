import type { SettingDefinition, SettingGroup } from "obsidian";
import { Feature } from "@/capabilities/base/feature";
import {
  CURRENT_LINE_HIGHLIGHT_STYLE,
  type CurrentLineHighlightStyle as CurrentLineHighlightStyleType,
} from "@/capabilities/constants";

export default class CurrentLineHighlightStyle extends Feature {
  readonly settingKey = "currentLine.currentLineHighlightStyle" as const;

  override getBodyClasses(): string[] {
    return [
      "ptm-current-line-highlight-box",
      "ptm-current-line-highlight-underline",
    ];
  }

  registerSetting(settingGroup: SettingGroup): void {
    settingGroup.addSetting((setting) => {
      setting
        .setName("当前行高亮样式")
        .setDesc("当前行高亮的样式")
        .setClass("typewriter-mode-setting")
        .addDropdown((dropdown) =>
          dropdown
            .addOption(CURRENT_LINE_HIGHLIGHT_STYLE.BOX, "方框")
            .addOption(CURRENT_LINE_HIGHLIGHT_STYLE.UNDERLINE, "下划线")
            .setValue(this.getSettingValue() as CurrentLineHighlightStyleType)
            .onChange((newValue) => {
              this.changeCurrentLineHighlightStyle(
                newValue as CurrentLineHighlightStyleType
              );
            })
        );
    });
  }

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: "当前行高亮样式",
      desc: "当前行高亮的样式",
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addDropdown((dropdown) =>
          dropdown
            .addOption(CURRENT_LINE_HIGHLIGHT_STYLE.BOX, "方框")
            .addOption(CURRENT_LINE_HIGHLIGHT_STYLE.UNDERLINE, "下划线")
            .setValue(this.getSettingValue() as CurrentLineHighlightStyleType)
            .onChange((newValue) => {
              this.changeCurrentLineHighlightStyle(
                newValue as CurrentLineHighlightStyleType
              );
              onChanged?.();
            })
        );
      },
    };
  }

  override load() {
    super.load();
    this.applyClass();
  }

  private applyClass() {
    const currentLineStyleClass = `ptm-current-line-highlight-${this.getSettingValue()}`;
    console.debug("apply current line style ", currentLineStyleClass);
    for (const cl of this.getBodyClasses()) {
      this.tm.perWindowProps.bodyClasses.remove(cl);
    }
    this.tm.perWindowProps.bodyClasses.push(currentLineStyleClass);
    console.debug(this.tm.perWindowProps.bodyClasses);
  }

  private changeCurrentLineHighlightStyle(
    newValue: CurrentLineHighlightStyleType
  ) {
    console.debug("current line style", newValue);
    this.setSettingValue(newValue);
    this.applyClass();
    this.tm.saveSettings().catch((error) => {
      console.error("Failed to save settings:", error);
    });
  }
}
