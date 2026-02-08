## Why

当前测试主要覆盖 `src/lib`，但 API route 与关键用户旅程缺少自动化保障，导致回归风险高、改动信心不足。需要补齐“API 集成 + 关键旅程 E2E + 覆盖率门槛”的最小闭环，并接入 CI。

## What Changes

- 新增 API route 集成测试脚手架：在 `src/app/api/**/*.test.ts` 中对关键接口进行请求/响应级测试，覆盖 CRUD / Share / Chat / Save 的核心分支（授权、校验、成功/失败返回）。
- 新增至少 1 条关键用户旅程 UI E2E：覆盖 Landing -> Try -> Edit -> Export/Share 的最小路径，保证主路径可走通。
- 启用 Vitest Coverage，并在 CI 中强制最低覆盖率阈值；当低于阈值时让 CI 失败，降低“无测试改动”进入主干的概率。

## Capabilities

### New Capabilities

- `api-route-integration-tests`: 为核心 API route 提供可复用的测试基建与用例集合（mock auth/db、构造 request、断言响应结构）。
- `ui-user-journey-e2e`: 提供关键用户旅程的浏览器级自动化测试（最小路径可跑通、失败可定位）。
- `vitest-coverage-thresholds`: 统一启用覆盖率采集与阈值校验，并接入 CI 作为质量门槛。

### Modified Capabilities

- (none)

## Impact

- 测试与工具链：Vitest 配置、增加 coverage provider 依赖、增加 UI E2E 依赖与运行脚本。
- CI：更新 `.github/workflows/ci.yml` 以执行 coverage，并新增/更新 E2E workflow 运行 UI 旅程测试。
- 代码范围：新增 `src/app/api/**/*.test.ts` 与少量测试辅助工具；可能需要对部分 API route 做轻量可测性改造（不改行为）。
