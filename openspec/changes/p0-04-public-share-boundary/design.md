## Context

当前 `mindmaps` 与 `mindmap_nodes` 存在面向匿名用户的 public `select` RLS policy（仅依赖 `is_public=true`）。这意味着任何持有 anon key 的请求都可以枚举所有公开导图及节点数据（包含 `public_slug`），与“持链接可见”语义不一致。

同时，`GET /api/public/:slug` 当前通过 Supabase client 直接 `select` `mindmaps`/`mindmap_nodes`，依赖上述 public RLS 才能工作。

## Goals / Non-Goals

**Goals:**

- 匿名用户无法通过直接 `select` 枚举公开导图列表或批量读取节点
- 公开读取仅通过受控 `public_slug` 路径完成（slug 需不可预测）
- 公开 API 响应最小化（不返回聊天数据/内部多余字段）
- 停止分享后旧链接不可访问（保持现有 share API 语义）

**Non-Goals:**

- 防止 slug 被暴力穷举（slug 使用 UUID，风险可接受）
- 公开页 2.0 的阅读体验优化（P2）

## Decisions

1. **移除 public `select` policies**
   - `mindmaps`: drop `Mindmaps: public can read public mindmaps`
   - `mindmap_nodes`: drop `Mindmap nodes: public can read public mindmap nodes`

2. **新增 SECURITY DEFINER RPC 读取公开快照**
   - `public.mma_get_public_mindmap_snapshot(p_slug text)`（命名可按现有 `mma_*` 习惯）
   - 仅按 `public_slug = p_slug AND is_public = true` 命中一张导图
   - 返回最小字段：`title`, `root_node_id`, `updated_at` 与 `nodes`（JSON 数组）
   - `grant execute` 给 `anon` 与 `authenticated`

3. **公开 API route 仅调用 RPC**
   - `GET /api/public/:slug` 改为 `.rpc(...)` 获取快照
   - 不再直接 `select` `mindmaps`/`mindmap_nodes`

## Risks / Trade-offs

- **[Risk] 迁移先后顺序导致公开页短暂不可用** → Mitigation：同一 PR 同时提交 migration + API 修改；生产发布时先跑 migration 再发布应用
- **[Risk] RPC 返回结构变更导致前端解析失败** → Mitigation：保持字段与当前 `nodeRowsToMindmapState` 需要的一致（id/parent_id/text/notes/order_index/pos_x/pos_y）
- **[Risk] SECURITY DEFINER search_path 污染** → Mitigation：函数显式 `set search_path = public`
