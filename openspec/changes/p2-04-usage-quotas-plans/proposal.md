## Why

当前缺少“用量可见 + 服务端配额兜底 + 套餐限额配置”的基础能力，导致成本不可控、超额体验不可预期，也无法形成可落地的升级路径。需要先补齐可观测、可限制、可解释的配额能力，为后续商业化与运营打底。

## What Changes

- 新增 Supabase 数据表：`plan_limits`（套餐限额配置）、`usage_counters`（按周期统计用量）。
- 新增服务端配额检查能力（在关键请求链路注入），对超额请求返回明确错误码与升级入口。
- 新增用量查询接口与前端用量面板，展示 AI/导出/分享的当前用量与上限，并提供“查看套餐/升级”入口。
- 为配额超额场景补充统一的错误返回结构（含 `code=quota_exceeded`、`metric/used/limit/resetAt/upgradeUrl`）。

## Capabilities

### New Capabilities

- `usage-quotas`: 套餐限额配置、用量计数、配额校验与超额降级（含用量展示与升级路径）。

### Modified Capabilities

- （无）

## Impact

- 数据库：新增迁移（tables + RLS + indexes + RPC）。
- API：新增 `GET /api/usage`；在 `/api/ai/chat`、`/api/ai/chat/export`、`/api/mindmaps/:id/share` 注入配额检查。
- 前端：`/mindmaps` 增加用量面板；新增（或补齐）升级入口页面。
- 测试：新增/更新 API route tests 覆盖超额路径与正常路径。
- 工具：更新 `scripts/check_supabase_schema.mjs` 以校验新表存在性。
