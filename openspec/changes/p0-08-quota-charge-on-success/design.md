## Context

当前配额通过 Supabase RPC `mma_consume_quota` 做原子校验+增量；但在 `/api/ai/chat` 等路径中，RPC 在外部调用（LLM/导出构建）完成前被执行，导致 provider 错误、模型输出无效、或最终返回 `ok:false` 时仍被计费。

该问题会直接损害用户对“用量/计费公平”的信任，并增加重试成本（失败越多，扣次数越多）。

## Goals / Non-Goals

**Goals:**

- 服务端对 metered 操作支持“两阶段”配额：
  - **预检查**：在外部调用前阻断超额（避免不必要的模型成本）。
  - **成功后计费**：仅在最终成功响应（HTTP 200 且 `ok:true`）时增加用量计数。
- 覆盖 `/api/ai/chat` 与 `/api/ai/chat/export` 两条 metered 路径。
- 当配额 schema/RPC 未部署时保持向后兼容：服务降级为 `enforced=false`（不阻断、不计费）。

**Non-Goals:**

- 不引入“预留/冻结/退款”式的复杂计费状态机（例如 reservation + TTL）。
- 不调整套餐/展示面板（仅实现计费时机与预检查能力）。

## Decisions

- 采用新增 RPC `mma_check_quota(...)`（只读检查）而不是改造 `mma_consume_quota` 签名：
  - 保持现有 `mma_consume_quota` 调用方兼容与简单性。
  - 让 check/consume 语义更清晰，便于测试覆盖与日志定位。
- API 调用顺序：
  - 外部调用前：`mma_check_quota` → 超额直接 `429 quota_exceeded`，不触发 provider/export。
  - 外部调用与校验成功后：`mma_consume_quota` → 仅成功时增量计数。
- 并发策略：
  - 允许极端并发下出现“check 通过但 consume 失败”的竞态；此时返回 `429 quota_exceeded` 并记录日志（避免出现 `ok:true` 但未计费的不一致）。

## Risks / Trade-offs

- [Race] `check` 与 `consume` 分离导致并发竞态，可能产生“外部调用已发生但最终 consume 失败”的浪费 → 通过预检查降低常见成本；并在错误响应中标注阶段以便观测与后续优化。
- [Migration] 需要新增 DB RPC → 通过独立 migration 落地；未部署时走 `enforced=false` 降级路径。

## Migration Plan

- Forward:
  - 新增 migration：创建 `public.mma_check_quota`，并 `grant execute` 给 `authenticated`。
  - 后端改造：使用 `checkQuota` + `consumeQuota` 两阶段调用。
  - 更新单测覆盖成功/失败/超额/并发边界。
- Rollback:
  - 回滚应用代码到旧逻辑或保留新逻辑但移除 `mma_check_quota`（会触发 `enforced=false` 降级，不再阻断超额）。
