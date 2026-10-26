import type { App, SettingDefinition, SettingDefinitionItem } from "obsidian";
import { PluginSettingTab, SettingGroup } from "obsidian";
import type TypewriterModeLib from "@/lib";

export default class TypewriterModeSettingTab extends PluginSettingTab {
  override icon = "type-outline";

  private readonly tm: TypewriterModeLib;

  constructor(app: App, tm: TypewriterModeLib) {
    super(app, tm.plugin);
    this.tm = tm;
  }

  private registerFeaturesInGroup(
    group: SettingGroup,
    features: Record<string, { registerSetting: (group: SettingGroup) => void }>
  ) {
    for (const feature of Object.values(features)) {
      feature.registerSetting(group);
    }
  }

  private featureDefs(
    features: Record<
      string,
      { getDefinition: (cb?: () => void) => SettingDefinition }
    >,
    onChanged: () => void
  ): SettingDefinition[] {
    return Object.values(features).map((feature) =>
      feature.getDefinition(onChanged)
    );
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const refresh = () => this.refreshDomState();

    return [
      ...this.featureDefs(this.tm.features.general, refresh),
      {
        type: "group",
        heading: "高亮当前行",
        items: this.featureDefs(this.tm.features.currentLine, refresh),
      },
      {
        type: "group",
        heading: "恢复光标位置",
        items: this.featureDefs(
          this.tm.features.restoreCursorPosition,
          refresh
        ),
      },
    ];
  }

  override display(): void {
    this.containerEl.empty();

    const generalGroup = new SettingGroup(this.containerEl);
    this.registerFeaturesInGroup(generalGroup, this.tm.features.general);

    const currentLineGroup = new SettingGroup(this.containerEl).setHeading(
      "高亮当前行"
    );
    this.registerFeaturesInGroup(
      currentLineGroup,
      this.tm.features.currentLine
    );

    const restoreCursorGroup = new SettingGroup(this.containerEl).setHeading(
      "恢复光标位置"
    );
    this.registerFeaturesInGroup(
      restoreCursorGroup,
      this.tm.features.restoreCursorPosition
    );
  }
}
