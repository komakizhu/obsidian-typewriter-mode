// ADAPTED FROM https://github.com/dy-sh/obsidian-remember-cursor-position/blob/master/main.ts

import type { SelectionRange } from "@codemirror/state";
import type { TAbstractFile } from "obsidian";
import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class RestoreCursorPosition extends FeatureToggle {
  readonly settingKey =
    "restoreCursorPosition.isRestoreCursorPositionEnabled" as const;
  protected settingTitle = "恢复光标位置";
  protected settingDesc = "打开文件时恢复上次的光标位置";

  get state(): Record<string, SelectionRange> {
    return this.tm.settings.restoreCursorPosition.cursorPositions as Record<
      string,
      SelectionRange
    >;
  }

  set state(value: Record<string, SelectionRange>) {
    this.tm.settings.restoreCursorPosition.cursorPositions = value;
  }

  override enable(): void {
    super.enable();

    this.tm.plugin.registerEvent(
      this.tm.plugin.app.workspace.on("quit", this.saveState)
    );

    this.tm.plugin.registerEvent(
      this.tm.plugin.app.vault.on("rename", this.onRenameFile)
    );

    this.tm.plugin.registerEvent(
      this.tm.plugin.app.vault.on("delete", this.onDeleteFile)
    );
  }

  override disable(): void {
    this.saveState().catch((error) => {
      console.error("Failed to save cursor state:", error);
    });
    this.tm.plugin.app.workspace.off("quit", this.saveState);
    // @ts-expect-error
    this.tm.plugin.app.vault.off("rename", this.onRenameFile);
    // @ts-expect-error
    this.tm.plugin.app.vault.off("delete", this.onDeleteFile);
  }

  readonly saveState = async () => {
    console.debug("Save cursor state");
    await this.tm.saveSettings();
  };

  private readonly onRenameFile = (file: TAbstractFile, oldPath: string) => {
    const newName = file.path;
    const oldName = oldPath;
    this.state[newName] = this.state[oldName];
    delete this.state[oldName];
  };

  private readonly onDeleteFile = (file: TAbstractFile) => {
    const fileName = file.path;
    delete this.state[fileName];
  };

  setCursorState(fileName: string, st: SelectionRange) {
    if (!fileName) {
      return;
    }
    this.state[fileName] = st;
    console.debug("setCursorState", fileName, st);
  }
}
