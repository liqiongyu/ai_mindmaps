## UX / UI

位置：编辑器右侧 AI 侧栏（`MindmapChatSidebar`）。

### Prompt chips

在输入框上方提供 chips（点击填充/追加）：

- 扩展分支
- 补全细节
- 重组结构
- 提炼为行动项
- 生成示例
- 找出风险

规则：

- 输入框为空：点击 chip 直接填充模板。
- 输入框非空：点击 chip 以换行追加模板（不覆盖用户已输入内容）。

### 约束面板（Advanced / 折叠）

字段：

- 输出语言：中文 / 英文（默认中文）
- 分支数：2 / 4 / 6 / 8（默认 4）
- 深度：1 / 2 / 3（默认 2）
- 允许移动：默认允许
- 允许删除：默认不允许

约束摘要：

- 每条 assistant 响应下展示一次本次请求使用的约束摘要（便于复盘）。

## Prompting / Enforcement

后端在 system instructions 中注入 constraints block（语言/分支数/深度/允许移动/允许删除）。

- `allowDelete=false` 时：prompt 明确禁止输出 `delete_node`，并在服务端拦截（400）。
- `allowMove=false` 时：prompt 明确禁止 `move_node` / `reorder_children`，并在服务端拦截（400）。
