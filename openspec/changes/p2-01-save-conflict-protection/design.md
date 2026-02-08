## Context

- 当前保存链路通过 `mma_replace_mindmap_nodes`（Supabase RPC）实现“节点替换的原子化保存”，但缺少**并发版本冲突保护**。
- 多会话/多设备同时编辑同一张导图时，后写入会静默覆盖先写入，造成数据丢失。
- 目标是在不引入复杂协同（OT/CRDT）的前提下，用**乐观并发控制（Optimistic Concurrency Control）**提供可解释、可恢复的冲突处理。

## Goals / Non-Goals

**Goals:**

- 为 `mindmaps` 引入递增版本号 `version`，并在每次成功保存时原子递增。
- 保存请求携带 `baseVersion`；当服务端版本不一致时以 `409 Conflict` 阻止覆盖并返回可用于决策的信息（例如服务端当前版本）。
- 前端在冲突时进入“暂停自动保存”的可恢复状态，并提供明确的冲突处理策略：
  - 加载最新（放弃本地未保存变更）
  - 覆盖保存（以最新版本为基线重试，明确覆盖远端）
  - 另存为副本（保留本地变更但不覆盖原导图）
- 保存逻辑保持原子性：冲突检查、版本递增与节点替换在 DB 侧保持一致性。

**Non-Goals:**

- 不实现多人实时协同编辑（OT/CRDT）与自动合并策略。
- 不提供“逐节点合并/三方合并”这类复杂冲突解决（先提供最小可行且可解释的策略）。
- 不引入依赖真实 Supabase/外部服务的端到端联调测试（以 route 集成测试为主）。

## Decisions

1. **DB：`mindmaps.version bigint not null default 1`**
   - 每次保存成功后 `version = version + 1`。
   - `version` 作为客户端 `baseVersion` 的对照值（等价于 etag 语义），用于检测并发覆盖。

2. **RPC：在 `mma_replace_mindmap_nodes` 中做 CAS（compare-and-swap）**
   - RPC 增加参数 `p_base_version bigint`，并将返回值由 `void` 调整为 `jsonb`：
     - 成功：`{ ok: true, version: <nextVersion> }`
     - 冲突：`{ ok: false, code: "VERSION_CONFLICT", version: <currentVersion> }`
   - 先校验 payload，再执行 `update mindmaps ... where version = p_base_version returning version` 以“抢占”版本。
   - 版本抢占成功后再执行节点 delete/insert；如后续校验/写入失败，通过抛异常让整个事务回滚，避免出现“版本递增但节点未写入”的不一致。

3. **API：保存接口协议扩展**
   - `POST /api/mindmaps/:id/save` 请求体新增 `baseVersion`（必填）。
   - 冲突时返回 `409`，并携带 `{ ok: false, code: "VERSION_CONFLICT", message, serverVersion }`。
   - 成功时返回 `{ ok: true, version }`（前端用返回值更新本地版本，避免漂移）。

4. **前端：MindmapEditor 保存状态机扩展**
   - 初始化时从 `GET /api/mindmaps/:id` 读取 `version` 并缓存为 `persistedVersion`（同时维护 ref 供异步保存闭包读取）。
   - 自动保存请求携带 `baseVersion: persistedVersion`。
   - 收到 `409 VERSION_CONFLICT`：
     - 暂停自动保存（复用现有 `persistedSavePaused` 机制）
     - 展示冲突提示文案：`检测到版本冲突，已阻止覆盖保存。`
     - 提供 3 个动作：
       - **加载最新**：重新拉取远端 state/ui/version 并替换当前编辑状态
       - **覆盖保存**：以 `serverVersion` 更新 `persistedVersion` 后立刻重试保存当前 state（明确覆盖远端）
       - **另存副本**：创建新 mindmap，并将当前 state 保存进去后跳转到新导图

## Risks / Trade-offs

- [版本类型] `bigint` 在前端使用 `number` 可能存在超出安全整数的风险 → MVP 阶段版本递增频率可控；后续如需要可改为 string 传输。
- [覆盖保存的语义] “覆盖保存”会丢弃远端在冲突期间的改动 → 通过显式文案与二次确认（如需要）降低误操作风险。
- [另存副本的完整性] 初版可能仅复制节点 state（不复制 UI state/positions/chat） → 后续可迭代复制更多相关数据。
- [测试覆盖] UI 冲突路径难以在无真实登录态的 E2E 中覆盖 → 通过 API route 集成测试 + 前端逻辑单测覆盖核心分支。
