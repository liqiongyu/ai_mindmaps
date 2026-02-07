## 1. Setup

- [x] 1.1 Add Azure OpenAI SDK and env loader dependencies
- [x] 1.2 Update `.env.example` with Azure OpenAI e2e settings
- [x] 1.3 Add an opt-in `pnpm -s test:e2e` with separate Vitest config

## 2. Core Implementation

- [x] 2.1 Implement an env-driven Azure OpenAI client helper
- [x] 2.2 Add an Azure OpenAI e2e test that asserts non-empty output

## 3. Verification

- [x] 3.1 Verify `pnpm -s test` still passes (no network calls)
- [x] 3.2 Verify `pnpm -s test:e2e` runs (requires `OPENAI_API_KEY`)
