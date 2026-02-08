## Context

MMA 当前已具备核心编辑/AI 改图/分享/导出等能力，但缺少“套餐限额 + 用量计数 + 服务端强制配额”的基础设施：

- 用户无法看到自己的 AI/导出/分享用量，成本与权益边界不清晰；
- 服务端缺少统一配额兜底，无法防止滥用与不可控成本；
- 没有可运营的限额配置入口，后续商业化/运营策略难以落地。

本变更引入两张基础表 `plan_limits` 与 `usage_counters`，并在关键 API 请求链路注入配额校验，提供清晰的超额降级与升级路径。

## Goals / Non-Goals

**Goals:**

- 服务端对关键成本点（AI 请求、审计导出、公开分享）提供强制配额校验。
- 用户可见核心用量指标与上限，并能在超额时获得可理解的提示与升级入口。
- 套餐限额可配置（先支持最小“free”套餐），并可通过 DB 调整限额与开关（`is_enabled`）。
- 配额校验具备并发安全的原子性（避免并发请求绕过限额）。

**Non-Goals:**

- 不实现真实的订阅/支付/自动升级与计费流水（仅提供升级入口与配置基础）。
- 不在本阶段覆盖所有潜在消耗点（先覆盖 AI chat / audit export / share）。
- 不实现复杂的多层级权限（admin/组织）与企业级配额模型。

## Decisions

### 1) 指标（metrics）与周期（period）

- 指标键（kebab/snake 均可；本实现使用 `ai_chat`、`audit_export`、`public_shares`）：
  - `ai_chat`：`POST /api/ai/chat` 的 dryRun 预览请求（真实 provider 调用）消耗 1 次；
  - `audit_export`：`GET /api/ai/chat/export` 成功导出消耗 1 次；
  - `public_shares`：使用量为“当前公开中的导图数量（active shares）”，不走计数器自增。
- 默认周期：
  - `ai_chat`、`audit_export`：按天（`day`）重置，符合“明日重置”预期；
  - `public_shares`：`active`（不重置，取当前状态计数）。

### 2) 原子性：Postgres RPC 统一消耗配额

为避免并发请求“先查后写”导致的穿透，本变更在 DB 侧提供 `mma_consume_quota` RPC：

- 输入：`metric/plan/period/amount`
- 行为：读取 `plan_limits`，对 `usage_counters` 执行“检查 + 自增”的原子操作（行级锁）。
- 输出：`ok/used/limit/resetAt` 等结构，便于 API 返回统一错误信息。

API 层在“确定会产生消耗”时调用 RPC：

- `/api/ai/chat`：在构建完上下文、准备调用 provider 前消耗，避免因“上下文超限”之类非 provider 消耗计入用量。
- `/api/ai/chat/export`：在导出 payload 校验成功后消耗，确保仅对成功导出计数。

### 3) 套餐（plan）选择策略

当前无订阅系统，先采用最小可用策略：

- 服务端使用 `MMA_DEFAULT_PLAN`（默认 `free`）作为用户套餐；
- `plan_limits` 支持通过 DB 调整限额与开关，为后续订阅系统对接预留空间。

### 4) 超额降级与升级路径

- 超额时 API 返回 `429`（Too Many Requests）并携带：
  - `code: "quota_exceeded"`
  - `metric/used/limit/resetAt/upgradeUrl`
- 前端在 AI 请求失败提示中增加“升级”操作；在 `/mindmaps` 用量面板提供升级入口。

## Risks / Trade-offs

- [计划选择简单] → 当前仅支持默认套餐；后续订阅系统对接时需要补充“用户-套餐绑定”。Mitigation：保持 `plan_limits` 结构稳定，planKey 可由外部系统注入。
- [schema/函数缺失] → 若 Supabase 未执行迁移，配额能力不可用。Mitigation：服务端对缺失 RPC/表的错误做降级处理（默认放行），并在用量面板提示“用量不可用/不限额”。
- [active share 计数一致性] → 公开分享数使用实时查询（count mindmaps where is_public=true），可能带来额外查询开销。Mitigation：只在 share 操作与用量面板查询，频率可控；后续可改为触发器维护计数器。

## Migration Plan

1. 追加 Supabase migration：
   - 创建 `plan_limits`、`usage_counters`（含 RLS、索引）；
   - 创建并授权 `mma_consume_quota`；
   - seed 默认 `free` 限额（幂等）。
2. 后端接入：
   - `/api/ai/chat`、`/api/ai/chat/export`、`/api/mindmaps/:id/share` 引入配额校验。
3. 前端接入：
   - `/mindmaps` 增加用量面板（展示 used/limit、升级入口）。
4. 测试与验证：
   - API route tests 覆盖：正常消耗、超额返回 429、share 上限限制。

Rollback：

- 若需回滚，可停用 `plan_limits.is_enabled=false`（放行），或回滚迁移（删除新表/RPC）。前端用量面板可容错显示“不可用”。
