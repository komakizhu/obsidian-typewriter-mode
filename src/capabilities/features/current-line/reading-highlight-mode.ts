import CurrentLineSelectSetting from "./select-setting";

export default class ReadingHighlightMode extends CurrentLineSelectSetting<
  "block" | "line",
  "currentLine.readingHighlightMode"
> {
  readonly settingKey = "currentLine.readingHighlightMode" as const;
  protected readonly settingTitle = "阅读模式高亮范围";
  protected readonly settingDesc =
    "选择在阅读模式中高亮最后编辑位置所在的内容块或排版行。";
  protected readonly options = {
    block: "内容块",
    line: "当前行",
  };
}
