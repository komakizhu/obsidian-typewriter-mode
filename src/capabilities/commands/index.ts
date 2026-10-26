import type TypewriterModeLib from "@/lib";
import type { AbstractCommand } from "../base/abstract-command";
import { TogglePlugin } from "./toggle-plugin";

export function getCommands(
  tm: TypewriterModeLib
): Record<string, AbstractCommand> {
  return Object.fromEntries(
    [new TogglePlugin(tm)].map((cmd) => [cmd.commandKey, cmd])
  );
}
