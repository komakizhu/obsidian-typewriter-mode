import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class OnlyMaintainTypewriterOffsetWhenReached extends FeatureToggle {
  readonly settingKey =
    "typewriter.isOnlyMaintainTypewriterOffsetWhenReachedEnabled" as const;
  protected hasCommand = false;
  protected settingTitle = "仅在到达位置后保持打字机偏移";
  protected settingDesc =
    "光标所在行只有在到达指定的打字机偏移位置后才会滚动到编辑器中央，从而移除编辑器顶部的额外空白。";
}
