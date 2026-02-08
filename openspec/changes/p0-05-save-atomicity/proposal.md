## Why

当前保存存在非原子 fallback（逐行 upsert + cleanup）。在错误/中断场景下，可能出现“部分写入成功”，从而造成用户看到画布已变更，但刷新后丢失或结构异常，损害信任。

同时，部分持久化能力（如 chat / uiState 表、或原子保存 RPC）在未迁移环境下会静默降级，导致“看似成功但不可持久化”的错觉。

## What Changes

- 保存 API 仅保留原子 RPC 路径，移除逐行 upsert fallback（杜绝半保存）
- `GET /api/mindmaps/:id` 增加 `persistence: { chat: boolean, uiState: boolean }`，让前端明确提示能力可用性
- `POST /api/ai/chat` 返回可选 `persistence: { chatPersisted: boolean }`，区分“已生成/已应用”与“聊天是否已落库”
- 收紧 `MindmapStateSchema`：`id/rootNodeId/parentId` 均为 UUID；并提供 try 草稿的兼容迁移，避免用户草稿丢失
- 前端在保存失败时明确提示“未完成云端持久化”，并提供重试/复制错误信息；AI 改图后提示“已应用”与“正在保存/已保存”的差异

## Capabilities

### New Capabilities

- `mindmap-persistence-contract`: 暴露持久化能力与结果（chat/uiState/chatPersisted）

### Modified Capabilities

- `mindmap-save`: 保存仅支持原子 RPC（无 fallback）

## Impact

- `src/app/api/mindmaps/[mindmapId]/save/route.ts`：移除 fallback，完善错误码与信息
- `src/app/api/mindmaps/[mindmapId]/route.ts`：新增 `persistence` 字段（chat/uiState）
- `src/app/api/ai/chat/route.ts`：返回 `chatPersisted` 并在缺失 schema 时显式标记
- `src/lib/mindmap/storage.ts` + tests：UUID schema 收紧与样例/草稿兼容
- `src/app/mindmaps/[mindmapId]/MindmapEditor.tsx` / `MindmapChatSidebar.tsx`：持久化提示、保存失败策略与文案
