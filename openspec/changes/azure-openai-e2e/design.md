## Context

The codebase will depend on an Azure OpenAI deployment (model `gpt-5-mini`). We want a simple, real-network end-to-end test to validate SDK wiring and environment configuration early, without making CI flaky or incurring LLM costs in normal `pnpm test` runs.

## Goals / Non-Goals

**Goals:**

- Provide a repeatable `pnpm -s test:e2e` that calls Azure OpenAI and validates a basic response.
- Keep default unit tests (`pnpm -s test`) deterministic and offline.
- Centralize Azure OpenAI client creation in a small helper for reuse by future API routes.

**Non-Goals:**

- Full browser/UI e2e testing (Playwright) in this change.
- Testing correctness/quality of model outputs (only connectivity + basic shape).
- Running LLM calls in GitHub Actions by default.

## Decisions

- Use the official `openai` Node SDK with `AzureOpenAI`.
  - Rationale: supports Azure auth + endpoint conventions and reduces custom HTTP code.
  - Alternative: manual `fetch` to `/openai/responses` (more control, more boilerplate).
- Add a dedicated Vitest config (`vitest.e2e.config.ts`) and a separate script (`pnpm -s test:e2e`).
  - Rationale: prevents accidental network calls in `pnpm -s test` and avoids CI flakiness/cost.
- Use environment variables for all Azure settings and document them in `.env.example`.
  - Rationale: avoids hardcoding environment-specific endpoints/deployments.

## Risks / Trade-offs

- [Risk] LLM responses can be non-deterministic. → Mitigation: assert only basic invariants (request succeeds; non-empty text returned).
- [Risk] Running e2e tests incurs cost. → Mitigation: keep them opt-in via `pnpm -s test:e2e` and fail fast when env is missing.
- [Risk] Proxy/network environment can break tests. → Mitigation: keep errors actionable; do not run in default CI.
