## Design Overview

### Data model (Supabase)

- 使用 `private` schema 存储 telemetry，避免被 PostgREST 默认暴露
- 通过 `SECURITY DEFINER` RPC 写入事件（anon + authenticated 可写；读取走聚合 RPC）

**Tables**

- `private.telemetry_events`
  - `id` uuid pk
  - `created_at` timestamptz
  - `event_name` text
  - `session_id` text
  - `user_id` uuid null (auth.uid())
  - `path` text
  - `properties` jsonb

**RPC**

- `public.mma_log_events(p_session_id text, p_path text, p_events jsonb)` → void
  - 校验 session_id 长度、events 数量、event_name 白名单、properties 形状
  - 一次调用批量写入，降低网络与 DB 开销

- `public.mma_get_daily_funnel(p_days int)` → table
  - 按日输出 session 维度的漏斗计数（以及保存/AI 关键健康指标的基础聚合）
  - 读取权限：`authenticated`（后续可加 admin 限制）

### Client SDK

- `getSessionId()`：localStorage 持久化 `mma:session_id:v1`
- `track(name, props?)`：队列 + debounce，优先 `sendBeacon`，fallback fetch

### API structured logs

- `/api/mindmaps/*` 与 `/api/ai/chat` 在返回前输出一条 JSON log：
  - `route`, `method`, `status`, `ok`, `code`, `duration_ms`, `user_id?`

## Risks / Trade-offs

- anon 写入可能被滥用：通过事件白名单 + 单次批量上限 + payload size 限制降低风险
- dashboard 权限：先限定为登录可见；后续再加 admin 白名单（P2 信任包）
