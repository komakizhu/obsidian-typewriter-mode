# Obsidian 打字机模式（汉化版）

这是 [Typewriter Mode](https://github.com/davisriedel/obsidian-typewriter-mode) 的中文维护版，为 Obsidian 提供当前行高亮和可选的光标位置恢复。

![Version](https://img.shields.io/badge/version-1.5.1--beta.1-blue)
![Obsidian](https://img.shields.io/badge/Obsidian-插件-483699)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能

- **当前行高亮**：编辑器里操作后突出显示光标所在行；阅读模式可选择高亮最近操作位置所在的内容块或排版行。
- **高亮外观**：可分别选择方角或圆角、普通／磨砂毛玻璃／液态玻璃材质，并选择高亮整条内容或只高亮正文两侧；外观设置同时适用于编辑视图和阅读视图。
- **仅高亮正文两侧**：可选只高亮正文列宽以外的左右区域，让中间正文保持原样。阅读视图还需要开启“阅读模式高亮最后编辑内容”。
- **恢复光标位置**：可选在重新打开笔记时恢复光标位置，默认关闭。
- **Markdown 表格兼容**：Live Preview 中的表格不会被当前行高亮覆盖。

## 安装

安装社区插件前，请确认已在 Obsidian 设置中关闭“安全模式”。

### 从 Obsidian 社区插件安装

1. 打开 **设置 → 社区插件 → 浏览**。
2. 搜索 **Typewriter Mode**。
3. 点击 **安装**，然后点击 **启用**。

### 手动安装

1. 从本仓库的 [Releases](https://github.com/komakizhu/obsidian-typewriter-mode/releases) 下载最新版本。
2. 将插件文件夹解压到仓库的插件目录：`<仓库>/.obsidian/plugins/`。
3. 在 Obsidian 中执行命令 **重新加载应用程序**，或重启 Obsidian。

### 使用 BRAT 安装测试版

按照 [BRAT 快速指南](https://github.com/TfTHacker/obsidian42-brat#quick-guide-for-using-brat) 添加以下仓库地址：

```text
https://github.com/komakizhu/obsidian-typewriter-mode
```

## 汉化说明

插件 ID 保持为 `typewriter-mode`。升级时会保留当前行和阅读模式高亮开关、光标恢复开关及已记录的光标位置；旧版滚动、颜色和样式设置会自动清理。

本仓库以 `zh-CN` 分支作为汉化维护分支。上游英文版本的修复会根据需要同步，汉化内容和本地化调整优先在本仓库维护。

## 致谢

本插件最初源自 [Typewriter Scroll](https://github.com/deathau/cm-typewriter-scroll-obsidian)，感谢 [deathau](https://github.com/deathau) 的工作。

恢复光标位置功能参考了 [Remember Cursor Position](https://github.com/dy-sh/obsidian-remember-cursor-position)，感谢 [dy-sh](https://github.com/dy-sh)。

## 变更记录与开发

- [变更记录](CHANGELOG.md)
- [开发说明](DEVELOPMENT.md)
- [原项目](https://github.com/davisriedel/obsidian-typewriter-mode)

欢迎提交 Issue 和改进建议。

## 许可证

本插件采用 MIT 许可证，详见 [LICENSE](LICENSE)。
