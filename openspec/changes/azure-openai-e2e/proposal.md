## Why

We need an end-to-end (real network) sanity check that our Azure OpenAI deployment (`gpt-5-mini`) is reachable and the SDK wiring/environment variables are correct.

## What Changes

- Add an Azure OpenAI client helper (env-driven) for server-side use.
- Add a dedicated e2e test suite that calls Azure OpenAI and asserts we get a valid response (opt-in; not part of default CI).
- Document required env vars in `.env.example` and provide a `pnpm test:e2e` entrypoint.

## Capabilities

### New Capabilities

- `azure-openai-e2e-tests`: Run opt-in e2e tests against an Azure OpenAI deployment to validate connectivity and SDK configuration.

### Modified Capabilities

- (none)

## Impact

- Dependencies: add `openai` SDK (and `dotenv` for tests)
- Tooling: add a separate Vitest config + script for e2e tests
- Docs/config: `.env.example` updated with Azure OpenAI settings
