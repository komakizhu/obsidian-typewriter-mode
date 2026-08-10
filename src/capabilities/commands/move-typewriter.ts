import type TypewriterModeLib from "@/lib";
import { AbstractCommand } from "../base/abstract-command";

function registerMoveTypewriterCommand(
  tm: TypewriterModeLib,
  direction: "up" | "down"
) {
  const editorCommand = direction === "up" ? "goUp" : "goDown";

  tm.plugin.addCommand({
    id: `move-typewriter-${direction}`,
    name: direction === "up" ? "上移打字机位置" : "下移打字机位置",
    editorCallback: (editor, _view) => {
      editor.exec(editorCommand);
      window.dispatchEvent(new Event("moveByCommand"));
    },
  });
}

export class MoveTypewriterUp extends AbstractCommand {
  readonly commandKey = "move-typewriter-up";
  readonly commandTitle = "上移打字机位置";
  protected override registerCommand(): void {
    registerMoveTypewriterCommand(this.tm, "up");
  }
}

export class MoveTypewriterDown extends AbstractCommand {
  readonly commandKey = "move-typewriter-down";
  readonly commandTitle = "下移打字机位置";
  protected override registerCommand(): void {
    registerMoveTypewriterCommand(this.tm, "down");
  }
}
