## Why

当前 `/api/ai/chat` 等接口在外部调用（LLM/导出）完成前就消耗配额，导致 provider 失败、输出无效或最终返回 `ok:false` 时用户仍损失次数，破坏信任与公平。

## What Changes

- 将配额语义调整为：仅在请求最终成功（HTTP 200 且 `ok:true`）时才增量计数。
- 在外部调用前做“预检查”，超额时直接返回 `429 quota_exceeded`，避免产生不必要的模型成本。
- 增加/扩展 Supabase RPC 以支持“检查不计费 + 成功后计费”的两阶段流程，并在并发场景下保持计数不出现负数或重复扣费。

## Capabilities

### New Capabilities

- `quota-precheck`: 支持不增量的配额预检查能力（为服务端在外部调用前阻断超额提供基础）。

### Modified Capabilities

- `usage-quotas`: 将“消耗配额”的时机从“请求开始”改为“请求成功后”，失败不计费；并保持超额在外部调用前被阻断。

## Impact

- DB: 新增 RPC（或扩展现有 RPC）以支持 quota check/consume 分离。
- API: `/api/ai/chat`、`/api/ai/chat/export` 调整调用时机与错误处理路径。
- Tests: 增加覆盖成功/失败/超额/并发边界的测试用例。
