import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class AllowBackspaceInHemingwayMode extends FeatureToggle {
  readonly settingKey =
    "hemingwayMode.isAllowBackspaceInHemingwayModeEnabled" as const;
  protected override toggleClass = null;
  protected settingTitle = "允许在海明威模式中使用 Backspace 键";
  protected settingDesc =
    "海明威模式启用时允许使用 Backspace 删除文本，适合在保持单向写作流程的同时修正错别字。";
}
