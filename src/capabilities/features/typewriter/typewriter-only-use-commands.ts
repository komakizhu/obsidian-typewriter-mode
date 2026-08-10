import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class TypewriterOnlyUseCommands extends FeatureToggle {
  readonly settingKey =
    "typewriter.isTypewriterOnlyUseCommandsEnabled" as const;
  protected override toggleClass = "ptm-typewriter-only-use-commands";
  protected settingTitle = "不使用方向键调整打字机位置";
  protected settingDesc =
    "打字机位置只会在使用本插件的移动命令时调整，使用方向键时不会调整。移动命令默认为 Cmd/Ctrl+ArrowUp/ArrowDown，也可以在 Obsidian 设置中为这些命令分配其他快捷键。";
}
