import CurrentLineSelectSetting from "./select-setting";

export default class HighlightShape extends CurrentLineSelectSetting<
  "square" | "rounded",
  "currentLine.highlightShape"
> {
  readonly settingKey = "currentLine.highlightShape" as const;
  protected readonly settingTitle = "高亮形状";
  protected readonly settingDesc = "选择当前行高亮面板的边角形状。";
  protected readonly options = {
    square: "方角",
    rounded: "圆角",
  };
}
