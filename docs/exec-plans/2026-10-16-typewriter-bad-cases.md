# Typewriter Mode bad-case 修复执行记录

日期：2026-10-16
基线：`471f7a1`（归档分支 `publish/typewriter-highlight-fix`）
执行分支：`codex/typewriter-bad-cases`

## 范围与工作区

- 归档源码保持在 `/Volumes/T7_1T/Agent/archive/Codex on mac/migration-2026-10-15/workspaces/Documents-Codex/2026-08-09/typewriter-mode/work/typewriter-mode-source`，未写入。
- 实施克隆位于 `/Volumes/T7_1T/Agent/work/obsidian-typewriter-mode/repo`；依赖和缓存位于同一任务目录的 `tools`、`cache` 下。
- 独立测试 Vault 位于 `/Volumes/T7_1T/Agent/work/obsidian-typewriter-mode/test-vault`，仅包含合成笔记和安全设置。
- `artifacts/baseline-build` 保存了基线 `main.js`、`styles.css` 和 `manifest.json`，用于测试 Vault 回退。
- T7 挂载正常；本次开始前可用空间约 229 GiB。没有创建 Git worktree 或 Goal。

## 阶段进展

### 阶段一：失败用例和编辑器归属

- 先运行缺少实现辅助模块的红测试，确认用例确实不能通过。
- 新增编辑器文件/实例归属、历史选区收敛、Markdown 表格识别和事务状态辅助逻辑。
- `editorInfoField` 成为文件和编辑器信息来源；光标保存、恢复、文件排除和 frontmatter 判断均按当前编辑器计算。
- 初始化与文件切换共用当前实例恢复入口；异步恢复在执行前再次检查实例、文件、开关、锚点高亮和当前文档长度。
- 移动命令通过编辑器实例到插件实例的弱关联表直接路由；非目标窗格和禁用/排除窗格不移动、不滚动、不保存位置，销毁时解除关联。

### 阶段二：表格、设置和高亮

- 表格保护改为有效表头、分隔行和连续表格范围判断，并排除围栏及缩进代码块。
- 删除基于块高度的表格判定，正文折行仍使用当前 `EditorView.scrollDOM` 的内容坐标绘制。
- 设置重载先于表格早退处理；输入事务与重配置同批出现时保留重载标记。
- 禁用时清理装饰、当前行、滚动状态、留白和编辑器级禁用样式。

### 阶段三：失败分支和销毁

- 保存嵌入 Markdown 的 `MutationObserver`，销毁时断开；事件从实际注册的 Vault 对象注销。
- 跟踪待执行动画帧并在销毁时取消；回调发现实例已销毁时丢弃结果。
- 测量成功、返回空值、读取异常和请求异常均结束处理中状态或恢复滚动监听；延迟测量还会核对代次、编辑器文件和文档对象，旧结果直接丢弃。

## 已完成验证

- `bun test tests/regressions.test.ts tests/plugin-regressions.test.ts`：15 条通过，0 条失败，26 个断言。
- `bun tsc --noEmit`：通过。
- `bun ./scripts/build.ts`（Grass 0.13.4，工具安装在任务目录）：通过，生成 `dist/main.js` 和 `dist/styles.css`。
- `biome check src scripts`、`biome check tests`：通过。
- `stylelint 'src/**/*.scss'`：通过。
- `rumdl check .`：通过。
- `git diff --check`：通过。

## 后台界面验收状态

已把当前构建和 manifest 复制到测试 Vault 的 `.obsidian/plugins/typewriter-mode/`。通过 `open -g -j` 以后台方式启动 Obsidian 后，CLI 返回“Command line interface is not enabled. Please turn it on in Settings > General > Advanced.”。为保持窗口后台且不改动日常环境，本次没有前台打开设置、没有启用该 CLI，也没有声称已完成真实 DOM/滚动界面验收。待用户允许后台 CLI 或提供可用接口后，应在该测试 Vault 复验单窗格、分屏、表格、滚动、开关和销毁场景。

## 现有差异与交接

- `scripts/common` 保留基线已有的子模块内容不变，仅继续显示 `scripts/release-plugin.ts` 从 `100755` 到 `100644` 的原有权限差异。
- 未修改版本字段，未提交、合并、发布或安装到日常 Vault。
- 原生 Review 入口在当前环境未提供；当前记录只包含自动检查和本地代码审查结果，不能替代原生 Review。
