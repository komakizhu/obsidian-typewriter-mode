import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class WritingFocusVignette extends FeatureToggle {
  readonly settingKey = "writingFocus.doesWritingFocusShowVignette" as const;
  protected settingTitle = "写作专注暗角";
  protected settingDesc = "在写作专注模式下为屏幕边缘添加暗角效果";
}
