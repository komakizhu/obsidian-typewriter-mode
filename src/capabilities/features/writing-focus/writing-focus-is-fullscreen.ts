import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class WritingFocusIsFullScreen extends FeatureToggle {
  readonly settingKey = "writingFocus.isWritingFocusFullscreen" as const;
  protected settingTitle = "写作专注时全屏显示 Obsidian";
  protected settingDesc = "开启后，进入写作专注时将 Obsidian 窗口切换为全屏";
}
