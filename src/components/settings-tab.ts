import type { App, SettingDefinition, SettingDefinitionItem } from "obsidian";
import {
  Component,
  MarkdownRenderer,
  PluginSettingTab,
  SettingGroup,
} from "obsidian";
import type TypewriterModeLib from "@/lib";
import fundingText from "@/texts/Funding.md" with { type: "text" };

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
    return Object.values(features).map((f) => f.getDefinition(onChanged));
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const refresh = () => this.refreshDomState();

    return [
      // General — no heading
      ...this.featureDefs(this.tm.features.general, refresh),

      // Typewriter
      {
        type: "group",
        heading: "打字机滚动",
        items: [
          {
            name: "启用“保持当前行上下行数”后不可用",
            visible: () =>
              this.tm.settings.keepLinesAboveAndBelow
                .isKeepLinesAboveAndBelowEnabled,
          },
          ...this.featureDefs(this.tm.features.typewriter, refresh),
        ],
      },

      // Keep lines above and below
      {
        type: "group",
        heading: "保持当前行上下行数",
        items: [
          {
            name: "启用打字机滚动后不可用",
            visible: () =>
              this.tm.settings.typewriter.isTypewriterScrollEnabled,
          },
          ...this.featureDefs(this.tm.features.keepAboveAndBelow, refresh),
        ],
      },

      // Highlight current line
      {
        type: "group",
        heading: "高亮当前行",
        items: this.featureDefs(this.tm.features.currentLine, refresh),
      },

      // Limit line width
      {
        type: "group",
        heading: "限制行宽",
        items: this.featureDefs(this.tm.features.maxChar, refresh),
      },

      // Dimming
      {
        type: "group",
        heading: "淡化",
        items: this.featureDefs(this.tm.features.dimming, refresh),
      },

      // Writing focus
      {
        type: "group",
        heading: "写作专注",
        items: this.featureDefs(this.tm.features.writingFocus, refresh),
      },

      // Hemingway mode
      {
        type: "group",
        heading: "海明威模式",
        items: this.featureDefs(this.tm.features.hemingwayMode, refresh),
      },

      // Restore cursor position
      {
        type: "group",
        heading: "恢复光标位置",
        items: this.featureDefs(
          this.tm.features.restoreCursorPosition,
          refresh
        ),
      },

      // Update notice and funding
      {
        type: "group",
        heading: "更新通知与赞助",
        items: [
          ...this.featureDefs(this.tm.features.updates, refresh),
          {
            name: "",
            render: (setting) => {
              setting.settingEl.empty();
              const div = setting.settingEl.createDiv();
              const component = new Component();
              component.load();
              MarkdownRenderer.render(
                this.app,
                fundingText,
                div,
                this.app.vault.getRoot().path,
                component
              ).catch((error) => {
                console.error("Failed to render markdown:", error);
              });
            },
          },
        ],
      },
    ];
  }

  override display(): void {
    this.containerEl.empty();

    // General settings (no heading)
    const generalGroup = new SettingGroup(this.containerEl);
    this.registerFeaturesInGroup(generalGroup, this.tm.features.general);

    // Typewriter group
    const typewriterGroup = new SettingGroup(this.containerEl).setHeading(
      "打字机滚动"
    );
    if (
      this.tm.settings.keepLinesAboveAndBelow.isKeepLinesAboveAndBelowEnabled
    ) {
      typewriterGroup.addSetting((setting) => {
        setting.setName("启用“保持当前行上下行数”后不可用");
      });
    }
    this.registerFeaturesInGroup(typewriterGroup, this.tm.features.typewriter);

    // Keep lines above and below group
    const keepLinesGroup = new SettingGroup(this.containerEl).setHeading(
      "保持当前行上下行数"
    );
    if (this.tm.settings.typewriter.isTypewriterScrollEnabled) {
      keepLinesGroup.addSetting((setting) => {
        setting.setName("启用打字机滚动后不可用");
      });
    }
    this.registerFeaturesInGroup(
      keepLinesGroup,
      this.tm.features.keepAboveAndBelow
    );

    // Highlight current line group
    const currentLineGroup = new SettingGroup(this.containerEl).setHeading(
      "高亮当前行"
    );
    this.registerFeaturesInGroup(
      currentLineGroup,
      this.tm.features.currentLine
    );

    // Limit line width group
    const maxCharGroup = new SettingGroup(this.containerEl).setHeading(
      "限制行宽"
    );
    this.registerFeaturesInGroup(maxCharGroup, this.tm.features.maxChar);

    // Dimming group
    const dimmingGroup = new SettingGroup(this.containerEl).setHeading("淡化");
    this.registerFeaturesInGroup(dimmingGroup, this.tm.features.dimming);

    // Writing focus group
    const writingFocusGroup = new SettingGroup(this.containerEl).setHeading(
      "写作专注"
    );
    this.registerFeaturesInGroup(
      writingFocusGroup,
      this.tm.features.writingFocus
    );

    // Hemingway mode group
    const hemingwayGroup = new SettingGroup(this.containerEl).setHeading(
      "海明威模式"
    );
    this.registerFeaturesInGroup(
      hemingwayGroup,
      this.tm.features.hemingwayMode
    );

    // Restore cursor position group
    const restoreCursorGroup = new SettingGroup(this.containerEl).setHeading(
      "恢复光标位置"
    );
    this.registerFeaturesInGroup(
      restoreCursorGroup,
      this.tm.features.restoreCursorPosition
    );

    // Update notice and funding group
    const updatesGroup = new SettingGroup(this.containerEl).setHeading(
      "更新通知与赞助"
    );
    this.registerFeaturesInGroup(updatesGroup, this.tm.features.updates);

    const updateNoticeDiv = this.containerEl.createDiv();
    this.containerEl.appendChild(updateNoticeDiv);
    const fundingComponent = new Component();
    fundingComponent.load();
    MarkdownRenderer.render(
      this.app,
      fundingText,
      updateNoticeDiv,
      this.app.vault.getRoot().path,
      fundingComponent
    ).catch((error) => {
      console.error("Failed to render markdown:", error);
    });
  }
}
