import type {
  DropdownComponent,
  SettingDefinition,
  SettingGroup,
} from "obsidian";
import { Feature } from "@/capabilities/base/feature";
import type { SettingsPath, SettingValueAtPath } from "@/capabilities/settings";

export default abstract class CurrentLineSelectSetting<
  T extends string,
  P extends SettingsPath,
> extends Feature {
  abstract override readonly settingKey: P;
  protected abstract readonly settingTitle: string;
  protected abstract readonly settingDesc: string;
  protected abstract readonly options: Record<T, string>;

  override registerSetting(settingGroup: SettingGroup) {
    settingGroup.addSetting((setting) =>
      setting
        .setName(this.settingTitle)
        .setDesc(this.settingDesc)
        .setClass("typewriter-mode-setting")
        .addDropdown((dropdown) => this.configureDropdown(dropdown))
    );
  }

  override getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: this.settingTitle,
      desc: this.settingDesc,
      render: (setting) => {
        setting
          .setClass("typewriter-mode-setting")
          .addDropdown((dropdown) =>
            this.configureDropdown(dropdown, () => onChanged?.())
          );
      },
    };
  }

  private configureDropdown(
    dropdown: DropdownComponent,
    onChanged?: () => void
  ) {
    for (const [value, label] of Object.entries(this.options) as [
      T,
      string,
    ][]) {
      dropdown.addOption(value, label);
    }
    dropdown.setValue(this.getSettingValue() as string).onChange((value) => {
      if (!Object.hasOwn(this.options, value)) {
        return;
      }
      this.setSettingValue(value as SettingValueAtPath<P>);
      this.tm.readingModeHighlight.refresh();
      onChanged?.();
      this.tm.saveSettings().catch((error) => {
        console.error("Failed to save current-line appearance:", error);
      });
    });
  }
}
