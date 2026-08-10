import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class WritingFocusShowsHeader extends FeatureToggle {
  readonly settingKey = "writingFocus.doesWritingFocusShowHeader" as const;
  protected override toggleClass = "ptm-writing-focus-shows-header";
  protected settingTitle = "在写作专注中显示标题栏";
  protected settingDesc = "开启后，写作专注模式下显示标题栏";
}
