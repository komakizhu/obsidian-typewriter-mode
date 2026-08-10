import { FeatureToggle } from "@/capabilities/base/feature-toggle";

export default class DimTableAsOne extends FeatureToggle {
  readonly settingKey = "dimming.isDimTableAsOneEnabled" as const;
  protected override toggleClass = "ptm-dim-table-as-one";
  protected settingTitle = "编辑表格时不淡化任何单元格";
  protected settingDesc =
    "开启后，编辑表格时显示所有表格单元格；关闭后只显示当前正在编辑的单元格，其他单元格保持淡化。";
}
