## Why

当前多会话/多设备同时编辑同一张导图时，保存接口缺少版本冲突保护，会发生“静默覆盖保存”，导致数据丢失与用户信任受损。随着核心保存链路与原子化保存能力已具备，需要补齐“版本号/ETag + 冲突处理策略”的闭环，确保并发编辑场景下的数据安全与可恢复性。

## What Changes

- 为 `mindmaps` 引入递增版本号（`version`），并在每次成功保存时原子递增。
- `POST /api/mindmaps/:id/save` 请求增加 `baseVersion`（客户端保存时基于的版本）。
- 当 `baseVersion` 与服务端当前版本不一致时，保存接口返回 `409 Conflict`，并提供必要信息用于前端提示与下一步决策（例如最新版本号）。
- 前端在冲突时提供明确的冲突提示与处理策略：加载最新、覆盖保存、另存为副本（避免用户“被迫丢改动”）。

## Capabilities

### New Capabilities

- `mindmap-save-conflict-protection`: 定义导图版本号语义、保存请求的 `baseVersion` 约束、冲突错误码/响应形态，以及冲突时的用户决策路径（加载最新/覆盖/另存副本）。

### Modified Capabilities

- (none)

## Impact

- 数据库与 RLS：需要为 `mindmaps` 增加 `version` 字段，并确保原子保存/更新链路能一致地读取/递增版本。
- API：更新保存接口契约与错误语义（新增 `baseVersion` 入参与 `409` 冲突返回）。
- 前端编辑器：保存逻辑需要维护 `baseVersion`/当前版本，并在冲突时进入“可恢复”状态与 UI 决策流。
- 测试：补齐 API 冲突分支集成测试，并新增关键旅程 E2E（至少覆盖一次冲突提示与用户选择路径）。
