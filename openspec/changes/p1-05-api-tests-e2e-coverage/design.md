## Context

- 当前 `pnpm test` 主要覆盖 `src/lib/**`，`src/app/api/**/route.ts` 缺少集成测试。
- 现有 `pnpm test:e2e` 仅包含 Azure OpenAI provider 级 E2E（不覆盖产品关键路径 UI）。
- CI 目前只跑 `format/lint/typecheck/test/build`，未启用覆盖率与阈值门槛。

目标是引入一套“可跑、可维护、可逐步扩展”的测试基建：在不依赖真实 Supabase/LLM secrets 的前提下，先把核心 API 的请求/响应与关键旅程 UI 跑通，并把 coverage 作为 CI 质量门槛。

## Goals / Non-Goals

**Goals:**

- 新增 `src/app/api/**/*.test.ts`，用 mock Supabase server client 的方式对关键 API route 做集成测试（覆盖 auth/校验/成功/错误返回）。
- 新增至少 1 条 UI 旅程 E2E（Landing -> Try -> Edit -> Export/Share 的最小可行路径），不依赖真实 Supabase/LLM。
- 启用 Vitest coverage（v8 provider），配置按目录的最低阈值，并在 CI 中强制执行。

**Non-Goals:**

- 不引入“连接真实 Supabase 数据库”的端到端集成测试（避免 CI 依赖外部状态/密钥）。
- 不要求一次性把所有 API route 覆盖到高阈值；优先覆盖核心路径，后续逐步补齐。
- 不在本变更中重构产品逻辑（除非为可测性做极小改造且不改变行为）。

## Decisions

1. **API route 集成测试策略：mock `createSupabaseServerClient`**
   - 方案：在 `src/app/api/**/*.test.ts` 中通过 `vi.mock(\"@/lib/supabase/server\")` 注入可编排的 supabase mock（`auth.getUser` + `from/rpc`）。
   - 理由：避免 Next `cookies()`/Edge runtime 依赖；无需真实 Supabase secrets；覆盖 route 层的输入校验、状态码与响应结构。
   - 替代方案：真实 DB（成本高、CI 复杂、引入 flaky），或只测 `src/lib`（无法覆盖 route 约束与错误形态）。

2. **UI 旅程 E2E：使用 Playwright（通过 Vitest e2e 运行）**
   - 方案：引入 `playwright` 作为 devDependency，在 `src/e2e/**/*.e2e.test.ts` 中用 Playwright 驱动浏览器，覆盖最小用户路径。
   - 理由：浏览器级验证可覆盖真实交互与渲染；不依赖外部服务；与现有 `vitest.e2e.config.ts` 一致（仍使用 Vitest 统一执行）。
   - 运行方式：E2E 测试启动 Next dev server（指定端口），通过轮询等待 ready 后执行浏览器步骤；测试结束后关闭 server。

3. **Coverage provider 与阈值：使用 `@vitest/coverage-v8` + glob 阈值**
   - 方案：在 `vitest.config.ts` 开启 coverage 配置，新增 `pnpm test:coverage`，在 CI 中用该脚本替代 `pnpm test`。
   - 阈值：按目录配置（`src/lib/mindmap`、`src/lib/ai`、`src/app/api`），并排除 `*.test.ts/*.e2e.test.ts`。
   - 理由：将 coverage 作为“可量化的质量门槛”，鼓励新增代码同步补测试；glob 阈值允许分模块逐步提升。

## Risks / Trade-offs

- [CI 时间增加] → 将 UI E2E 放在独立 job/workflow；API/coverage 仍在 CI 主链路运行。
- [mock 与真实行为偏差] → mock 只用于 route 层输入/输出与分支覆盖；核心逻辑仍建议在 `src/lib` 通过单测保障。
- [Playwright 浏览器依赖] → 在 CI workflow 中显式安装浏览器（`npx playwright install --with-deps chromium`），并使用更宽松的超时。
