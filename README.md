# Obsidian 打字机模式（汉化版）

这是 [Typewriter Mode](https://github.com/davisriedel/obsidian-typewriter-mode) 的中文汉化维护版，为 Obsidian 提供专注、舒适的写作体验。

![Version](https://img.shields.io/badge/version-1.5.1--beta.1-blue)
![Obsidian](https://img.shields.io/badge/Obsidian-插件-483699)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能

- **打字机滚动**：让当前行保持在屏幕中固定的位置。
- **当前行高亮**：突出显示正在编辑的行。
- **上下文行数**：设置光标上下方需要保留的行数。
- **非焦点内容淡化**：淡化未聚焦的段落或句子，减少视觉干扰。
- **写作专注模式**：支持全屏写作、隐藏界面元素和专注视图。
- **限制每行字符数**：控制正文的最大行宽，改善阅读与写作节奏。
- **恢复光标位置**：重新打开笔记时恢复上次的光标位置。
- **海明威模式**：限制修改已经写好的内容，鼓励持续向前写作。
- **Markdown 表格兼容**：Live Preview 中的表格不会被“当前行高亮”覆盖，正文仍保持正常高亮。

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

本版本主要完成了插件界面、设置项、命令名称、状态栏提示、更新提示和资金支持入口的中文化。插件 ID 保持为 `typewriter-mode`，因此可以直接替换原 Typewriter Mode 插件目录，不需要修改已有设置。

本仓库以 `zh-CN` 分支作为汉化维护分支。上游英文版本的修复会根据需要同步，汉化内容和本地化调整优先在本仓库维护。

## 隐私与网络请求

插件只会向 `github.com` 发起一次网络请求，用于在安装新版本时获取更新说明。可以在插件设置中关闭更新提示；除此之外，插件不会发起其他网络请求。

## 致谢

本插件最初源自 [Typewriter Scroll](https://github.com/deathau/cm-typewriter-scroll-obsidian)，感谢 [deathau](https://github.com/deathau) 的工作。

句子高亮功能参考了 [Focus Active Sentence](https://github.com/artisticat1/focus-active-sentence)，感谢 [artisticat1](https://github.com/artisticat1)。

写作专注功能参考了 [Obsidian Focus Mode](https://github.com/ryanpcmcquen/obsidian-focus-mode)，感谢 [ryanpcmcquen](https://github.com/ryanpcmcquen)。

恢复光标位置功能参考了 [Remember Cursor Position](https://github.com/dy-sh/obsidian-remember-cursor-position)，感谢 [dy-sh](https://github.com/dy-sh)。

海明威模式参考了 [Obsidian Hemingway Mode](https://github.com/jobedom/obsidian-hemingway-mode)，感谢 [jobedom](https://github.com/jobedom)。

## 变更记录与开发

- [变更记录](CHANGELOG.md)
- [开发说明](DEVELOPMENT.md)
- [原项目](https://github.com/davisriedel/obsidian-typewriter-mode)

欢迎提交 Issue 和改进建议。

## 许可证

本插件采用 MIT 许可证，详见 [LICENSE](LICENSE)。
