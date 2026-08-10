import type { App, SettingDefinition, SettingGroup } from "obsidian";
import { AbstractInputSuggest, Modal, TFolder } from "obsidian";
import { Feature } from "@/capabilities/base/feature";
import { setSettingByPath } from "@/capabilities/settings";

function getVaultPaths(app: App): string[] {
  const paths = new Set<string>();
  for (const f of app.vault.getFiles()) {
    paths.add(f.path);
  }
  function walk(folder: TFolder) {
    if (folder.path) {
      paths.add(folder.path);
    }
    for (const child of folder.children) {
      if (child instanceof TFolder) {
        walk(child);
      }
    }
  }
  walk(app.vault.getRoot());
  return [...paths].sort();
}

class VaultPathSuggest extends AbstractInputSuggest<string> {
  private readonly vaultPaths: string[];

  constructor(app: App, inputEl: HTMLInputElement, vaultPaths: string[]) {
    super(app, inputEl);
    this.vaultPaths = vaultPaths;
  }

  protected override getSuggestions(query: string): string[] {
    const lower = query.toLowerCase();
    return this.vaultPaths
      .filter((p) => p.toLowerCase().includes(lower))
      .slice(0, 20);
  }

  override renderSuggestion(path: string, el: HTMLElement): void {
    el.setText(path);
  }
}

class FilePathsModal extends Modal {
  private readonly vaultPaths: string[];
  private readonly getEnabledPaths: () => string[];
  private readonly setEnabledPaths: (paths: string[]) => void;
  private readonly getDisabledPaths: () => string[];
  private readonly setDisabledPaths: (paths: string[]) => void;

  constructor(
    app: App,
    vaultPaths: string[],
    getEnabledPaths: () => string[],
    setEnabledPaths: (paths: string[]) => void,
    getDisabledPaths: () => string[],
    setDisabledPaths: (paths: string[]) => void
  ) {
    super(app);
    this.vaultPaths = vaultPaths;
    this.getEnabledPaths = getEnabledPaths;
    this.setEnabledPaths = setEnabledPaths;
    this.getDisabledPaths = getDisabledPaths;
    this.setDisabledPaths = setDisabledPaths;
  }

  override onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("typewriter-mode-file-paths-modal");
    this.setTitle("文件路径");

    const columnsEl = contentEl.createDiv({
      cls: "typewriter-mode-file-paths-columns",
    });

    this.renderSection(
      columnsEl,
      "启用路径",
      "仅在这些文件或文件夹中启用插件。留空则在所有文件中启用插件。",
      this.getEnabledPaths,
      this.setEnabledPaths
    );

    this.renderSection(
      columnsEl,
      "停用路径",
      "始终在这些文件或文件夹中停用插件，优先级高于启用路径。",
      this.getDisabledPaths,
      this.setDisabledPaths
    );
  }

  override onClose() {
    this.contentEl.empty();
  }

  private renderSection(
    columnsEl: HTMLElement,
    title: string,
    description: string,
    getPaths: () => string[],
    setPaths: (paths: string[]) => void
  ) {
    const columnEl = columnsEl.createDiv({
      cls: "typewriter-mode-file-paths-column",
    });

    columnEl.createEl("h3", { text: title });
    columnEl.createEl("p", {
      text: description,
      cls: "setting-item-description",
    });

    const inputEl = columnEl.createEl("input", {
      type: "text",
      placeholder: "输入以搜索库中的路径…",
      cls: "typewriter-mode-file-paths-input",
    });

    const listEl = columnEl.createDiv({
      cls: "typewriter-mode-file-paths-list",
    });

    const renderList = () => {
      listEl.empty();
      const paths = getPaths();
      if (paths.length === 0) {
        listEl.createEl("p", {
          text: "尚未配置路径。",
          cls: "setting-item-description",
        });
        return;
      }
      for (const [index, path] of paths.entries()) {
        const row = listEl.createDiv({ cls: "typewriter-mode-file-paths-row" });
        row.createEl("code", {
          text: path,
          cls: "typewriter-mode-file-paths-row-name",
        });
        const removeBtn = row.createEl("button", { text: "移除" });
        removeBtn.addEventListener("click", () => {
          const updated = [...getPaths()];
          updated.splice(index, 1);
          setPaths(updated);
          renderList();
        });
      }
    };

    renderList();

    const suggest = new VaultPathSuggest(this.app, inputEl, this.vaultPaths);
    suggest.onSelect((path) => {
      const current = getPaths();
      if (!current.includes(path)) {
        setPaths([...current, path]);
        renderList();
      }
      suggest.setValue("");
    });
  }
}

export default class EnabledFilePaths extends Feature {
  readonly settingKey = "general.enabledFilePaths" as const;

  getDefinition(onChanged?: () => void): SettingDefinition {
    return {
      name: "文件路径",
      desc: "配置在哪些文件或文件夹中启用或停用插件。",
      render: (setting) => {
        setting.setClass("typewriter-mode-setting").addButton((button) =>
          button.setButtonText("配置").onClick(() => {
            this.openModal();
            onChanged?.();
          })
        );
      },
    };
  }

  private openModal() {
    const app = this.tm.plugin.app;
    const vaultPaths = getVaultPaths(app);

    const getEnabled = () => this.tm.settings.general.enabledFilePaths ?? [];
    const setEnabled = (paths: string[]) => {
      this.setSettingValue(paths);
      this.tm.saveSettings().catch((error) => {
        console.error("Failed to save settings:", error);
      });
    };

    const getDisabled = () => this.tm.settings.general.disabledFilePaths ?? [];
    const setDisabled = (paths: string[]) => {
      setSettingByPath(this.tm.settings, "general.disabledFilePaths", paths);
      this.tm.saveSettings().catch((error) => {
        console.error("Failed to save settings:", error);
      });
    };

    new FilePathsModal(
      app,
      vaultPaths,
      getEnabled,
      setEnabled,
      getDisabled,
      setDisabled
    ).open();
  }

  registerSetting(settingGroup: SettingGroup): void {
    settingGroup.addSetting((setting) => {
      setting
        .setName("文件路径")
        .setDesc("配置在哪些文件或文件夹中启用或停用插件。")
        .setClass("typewriter-mode-setting")
        .addButton((button) =>
          button.setButtonText("配置").onClick(() => {
            this.openModal();
          })
        );
    });
  }
}
