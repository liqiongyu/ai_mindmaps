## Context

当前 `POST /api/mindmaps/:id/save` 在原子 RPC（`mma_replace_mindmap_nodes`）失败时，会进入逐行 upsert + cleanup 的 fallback 路径。这条路径：

- 非原子：中途失败会导致部分节点写入成功
- 难以推断结果：客户端很难判断“已应用”与“已持久化”的真实状态

另外，chat / uiState 的持久化在缺失迁移时会静默忽略（返回 ok 或空列表），若不向前端暴露能力状态，用户会误以为“保存/聊天记录已落库”。

## Goals / Non-Goals

**Goals**

- 保存路径在任何错误下保持原子：要么全成功，要么不写入（不出现半保存）
- 前端能明确提示持久化能力是否可用（chat / uiState）以及关键动作的持久化结果（chatPersisted）
- 统一入口 schema 校验：node id/parentId/rootNodeId 均为 UUID
- AI 改图后清晰区分“已应用到画布”与“已保存到云端”

**Non-Goals**

- 实现离线队列/后台重试系统（先做“明确 + 可恢复”）
- 完整的审计/会话导出（P1）

## Decisions

### 1) 保存仅走原子 RPC，移除 fallback

- `POST /api/mindmaps/:id/save` 仅调用 `mma_replace_mindmap_nodes`
- 任何 RPC 错误均直接失败返回（不再逐行写入）
- 对“RPC 缺失”返回明确错误码，前端提示“未迁移/能力不可用”

### 2) 暴露持久化能力状态

- `GET /api/mindmaps/:id` 返回 `persistence: { chat: boolean, uiState: boolean }`
- 判定策略：通过一次轻量查询捕获 `PGRST205`/缺表错误，将能力标记为 `false`（不阻塞主数据加载）

### 3) 暴露 chat 落库结果

- `POST /api/ai/chat` 返回 `persistence: { chatPersisted: boolean }`
- 当 chat schema 缺失或 insert 被判定为“缺表”时，仍返回 ok，但 `chatPersisted=false`

### 4) UUID schema 收紧 + try 草稿兼容迁移

- `MindmapStateSchema` 改为 UUID（`z.string().uuid()`）
- 为历史 try 草稿提供兼容：解析失败时尝试 legacy schema，并在客户端侧 remap 为 UUID 后继续使用

## Error Codes (server → client)

建议在 `ok=false` 的响应中包含 `code` 字段（前端可按 code 做更友好的提示）：

- `INVALID_BODY`：请求体不合法
- `PERSISTENCE_UNAVAILABLE`：原子保存 RPC 缺失或持久化能力不可用
- `SAVE_FAILED`：原子保存失败（非缺失能力）

## Risks / Trade-offs

- **移除 fallback 后，未迁移环境将无法保存**：通过 `persistence` 字段与明确错误码提示“需要先跑迁移”，避免“看似成功实际丢失”
- **UUID 收紧可能导致旧 try 草稿无法解析**：通过 legacy 解析 + remap 迁移降低损失
