import CurrentLineSelectSetting from "./select-setting";

export default class HighlightMaterial extends CurrentLineSelectSetting<
  "plain" | "frosted" | "liquid",
  "currentLine.highlightMaterial"
> {
  readonly settingKey = "currentLine.highlightMaterial" as const;
  protected readonly settingTitle = "高亮材质";
  protected readonly settingDesc = "选择普通、磨砂毛玻璃或液态玻璃外观。";
  protected readonly options = {
    plain: "普通",
    frosted: "磨砂毛玻璃",
    liquid: "液态玻璃",
  };
}
