## Context

`chat_messages` 当前用于：

- 编辑器侧边栏展示历史 AI 对话（含 ops、provider/model、时间）
- `/api/ai/chat/export` 导出审计 JSON

但 UI 中用户选择的 AI 约束（语言/深度/分支/允许移动/删除）不会被持久化到历史记录；刷新后无法复盘“当时约束是什么”。同时，高风险确认/审计导出需要稳定的 `changeSummary` 与 `deleteImpact`，不应依赖导出时再推导。

## Goals / Non-Goals

**Goals:**

- DB 增加 `chat_messages.metadata`（jsonb）用于扩展审计信息，默认 `{}`，不影响现有 RLS。
- `/api/ai/chat` 在写入 assistant 消息时持久化 constraints/summary/impact 等快照。
- history/export 返回 metadata；旧记录/缺失字段保持兼容。
- UI 在历史消息中读取 metadata 并显示约束摘要（存在时显示）。

**Non-Goals:**

- 不引入新的审计导出版本号（保持 `v1`，仅扩展字段）。
- 不在本变更中实现“回滚时间线/按消息回滚”（单独 issue）。

## Decisions

- `metadata` 设计为可扩展的 jsonb：
  - `constraints`: `AiChatConstraints`（归一化后的快照）
  - `changeSummary`: `OperationSummary`
  - `deleteImpact`: `{ nodes: number }`
  - 可选：`scope`、`selectedNodeId`、`dryRun`
- 写入策略：
  - 对 assistant 消息写入完整 metadata；对 user/system 消息可留空 `{}`。
  - 为兼容未迁移环境：插入/查询若因缺少 `metadata` 列失败，则回退到不包含该列的 SQL 并继续（metadata 视为缺失）。
- 影响规模计算：
  - `deleteImpact` 必须基于 **应用 ops 前** 的 state 计算，避免删除后节点不可见导致统计为 0。

## Risks / Trade-offs

- [Risk] metadata 列未部署会导致写入/查询失败 → 通过 insert/select 的“缺列回退”保持服务可用。
- [Risk] metadata 内容未来扩展导致 UI 解析不兼容 → UI 使用类型守卫/安全解析，仅展示可识别字段。

## Migration Plan

- Forward:
  - 新增 migration：`alter table chat_messages add column metadata jsonb not null default '{}'::jsonb`.
  - 部署后新写入消息会带 metadata；旧消息自动获得默认 `{}`。
- Rollback:
  - 回滚应用代码到不读取 metadata；或保留读取逻辑但 drop column 后依旧走缺列回退（仅丢失 metadata 功能）。
