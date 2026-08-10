import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class WritingFocusShowsHeader extends FeatureToggle {
  readonly settingKey = "writingFocus.doesWritingFocusShowStatusBar" as const;
  protected override toggleClass = "ptm-writing-focus-shows-status-bar";
  protected settingTitle = "在写作专注中显示状态栏";
  protected settingDesc = "开启后，写作专注模式下仍显示状态栏";
}
