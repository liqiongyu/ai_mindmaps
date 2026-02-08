## Why

当前 `chat_messages` 仅持久化 `content/operations/provider/model/created_at`，刷新后历史消息缺少当时的 AI 约束（constraints）与变更摘要，审计导出也无法完整复盘“当时怎么要求 AI、AI 做了什么”。

## What Changes

- 为 `chat_messages` 增加可扩展字段 `metadata jsonb not null default '{}'`。
- 在写入 assistant 消息时持久化：
  - `constraints`（归一化后的约束快照）
  - `changeSummary`、`deleteImpact`（用于审计复盘与高风险确认）
  - （可选）`scope`、`selectedNodeId`、`dryRun`
- 历史接口与审计导出接口返回 `metadata`（向后兼容旧记录/缺失字段）。
- UI：刷新后历史消息仍可展示 constraints 摘要（存在时显示，不存在则隐藏）。

## Capabilities

### New Capabilities

- `chat-message-metadata`: 为聊天消息提供可扩展的审计元数据（constraints/summary/impact）并在 history/export 中返回。

### Modified Capabilities

<!-- None: adds an optional metadata surface without changing existing ops protocol -->

## Impact

- DB: `chat_messages` 增加 `metadata jsonb` 列（RLS 不变）。
- API: `/api/ai/chat` 写入与 `/api/ai/chat`(GET history)/`/api/ai/chat/export` 读取返回扩展字段。
- UI: `MindmapChatSidebar` 历史消息解析 metadata 并展示约束摘要。
- Tests: 覆盖 metadata 存在/缺失的兼容行为与导出包含字段。
