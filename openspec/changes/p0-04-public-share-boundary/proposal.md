## Why

公开分享的产品语义是“公开（持链接可见）”，但当前 RLS 允许匿名直接 `select` 所有公开导图与节点，存在被枚举风险，和用户心智不一致。

## What Changes

- 收紧 RLS：移除对 `mindmaps` / `mindmap_nodes` 的匿名 public select（避免列表枚举）
- 新增 `SECURITY DEFINER` RPC：仅允许通过 `public_slug` 读取公开导图快照（最小化响应）
- `GET /api/public/:slug` 改为调用受控 RPC，并仅返回渲染必需字段（不返回聊天数据/内部多余字段）
- 保持分享 API（`POST/DELETE /api/mindmaps/:id/share`）行为不变：停止分享后旧链接不可访问

## Capabilities

### New Capabilities

- `public-mindmap-snapshot`: 通过受控 slug RPC 返回公开导图快照（防枚举）

### Modified Capabilities

- （无）

## Impact

- `supabase/migrations/*`：新增 RLS/RPC 迁移（drop public policies + add RPC + grants）
- `src/app/api/public/[slug]/route.ts`：切换为 RPC 读取
