## Overview

目标是在不牺牲“发送即得到有效结果”的前提下，引入可复用 preset，并把高风险变更变成“可预览、可确认、可取消”的流程。

核心策略：

1. **dry-run 先生成**：客户端发送 `dryRun: true` 获取 `assistant_message + operations` 以及预览元信息。
2. **客户端决策**：根据预览信息判断是否高风险；高风险弹窗确认，低风险自动应用。
3. **确认后落库**：应用后由客户端发起 confirm 请求，把 dry-run 的输出回传给服务端进行校验与持久化（避免重复调用模型导致预览与最终不一致）。

## Data Model

新增表：`ai_constraint_presets`

- `id uuid primary key`
- `owner_id uuid not null`（= `auth.uid()`）
- `name text not null`
- `config jsonb not null`（约束配置：`AiChatConstraints`）
- `created_at`, `updated_at`
- `unique(owner_id, name)`
- RLS：仅 owner 可读写

## API

### Presets CRUD

- `GET /api/ai/constraint-presets` → `{ ok: true, presets: Array<{ id, name, constraints, updatedAt }> }`
- `POST /api/ai/constraint-presets` body `{ name, constraints }`
- `PATCH /api/ai/constraint-presets/:id` body `{ name?, constraints? }`
- `DELETE /api/ai/constraint-presets/:id`

### Chat dry-run + confirm

`POST /api/ai/chat` 新增字段：

- `dryRun?: boolean`（默认 false）
- `providedOutput?: { assistant_message, operations, provider?, model? }`

行为：

- `dryRun: true` 且无 `providedOutput`：调用模型生成输出，但**不持久化** chat messages；返回预览信息
- `dryRun: false` 且有 `providedOutput`：**不调用模型**，对 providedOutput 做与正常输出同等的校验（schema/constraints/scope/apply），并持久化
- 其他情况：沿用当前行为（调用模型、持久化、返回）

响应补充：

- `changeSummary`: `{ add, rename, move, delete, reorder }`
- `deleteImpact`: `{ nodes: number }`（删除将影响的节点总数，含子树）

## High-risk definition

默认阈值：

- 若 `deleteImpact.nodes >= 10`（且 `delete > 0`），视为高风险，必须弹窗确认

提示文案：

- `检测到高风险操作（删除影响 {n} 个节点），请确认后应用。`

## UI

### Presets

在「高级设置」内加入：

- 预设下拉选择（默认 + 用户自定义）
- “保存为预设 / 更新预设 / 删除预设”操作

### Preview & confirm

发送流程改为：

1. `dryRun: true` 获取预览
2. 渲染变更摘要与删除影响规模
3. 若高风险：弹窗确认；取消则不应用
4. 应用后发送 confirm 请求进行持久化；若持久化失败则展示 warning（不阻断已应用结果）

## Risks / Mitigations

- 预览与最终不一致：confirm 复用 dry-run 输出（providedOutput），避免二次调用模型
- 客户端篡改 providedOutput：服务端仍做 scope/constraints/apply 校验，限制 operations 数量
- 额外一次网络请求：confirm 请求不调用模型，开销低；可在后续合并为单次事务
