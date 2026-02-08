## Why

当前 AI 约束属于“单次会话配置”，缺少可复用的 preset，并且在发生高风险变更（尤其是删除影响较大）时缺少“先预览、再确认”的闭环：

- 很难稳定复现一套高质量的约束组合（语言/深度/分支/移动/删除）
- 删除类变更的风险提示不足，容易误操作导致用户信任下降
- 变更摘要与影响规模需要在“应用前”可见，才能形成可控感

## What Changes

- 增加 AI 约束 preset：支持创建/切换/更新/删除（基于用户维度存储）
- `POST /api/ai/chat` 支持 `dryRun: boolean`，用于“先生成预览结果，再由客户端确认是否应用”
- 为 dry-run 返回补充字段：变更摘要 + 删除影响节点数（用于高风险提示）
- UI 在应用 ops 前展示预览与确认（高风险强确认；低风险可自动应用）

## Capabilities

### New Capabilities

- `ai-constraint-presets`: 约束 preset 的存储与管理
- `ai-dry-run-preview`: 高风险操作预览与确认

### Modified Capabilities

- `ai-chat-api`: `/api/ai/chat` 增强 dry-run/confirm 流程与预览字段
- `ai-chat-ui`: Chat 面板支持 preset 切换与高风险确认
