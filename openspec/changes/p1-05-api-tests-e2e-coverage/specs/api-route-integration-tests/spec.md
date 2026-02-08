## ADDED Requirements

### Requirement: Route handlers can be tested deterministically

API route handler tests MUST be runnable via `pnpm -s test` without requiring real Supabase credentials, external network calls, or LLM provider access.

#### Scenario: Running API route tests in CI with dummy env

- **WHEN** CI sets dummy Supabase env vars
- **THEN** `src/app/api/**/*.test.ts` MUST still execute successfully via mocks/stubs only

### Requirement: Core API routes have integration coverage

The test suite MUST include integration tests for core API routes covering CRUD, Share, Chat, and Save behaviors at the request/response layer.

#### Scenario: Mindmaps CRUD routes are covered

- **WHEN** running `pnpm -s test`
- **THEN** there MUST be tests that exercise create/list/load/delete mindmaps route handlers

#### Scenario: Share route is covered

- **WHEN** running `pnpm -s test`
- **THEN** there MUST be tests that exercise share start/stop route handlers

#### Scenario: Save route is covered

- **WHEN** running `pnpm -s test`
- **THEN** there MUST be tests that exercise the save route handler including success and failure cases

#### Scenario: Chat route is covered without provider calls

- **WHEN** running `pnpm -s test`
- **THEN** there MUST be tests that exercise the chat route handler without making any external provider calls

### Requirement: Auth and validation branches are asserted

For each covered route, tests MUST assert at least the following branches: unauthorized (401), invalid input (400), and a successful response (2xx) where applicable.

#### Scenario: Unauthorized request returns 401

- **WHEN** `supabase.auth.getUser()` returns no user
- **THEN** the route handler MUST return `401` with `{ ok: false, ... }`
