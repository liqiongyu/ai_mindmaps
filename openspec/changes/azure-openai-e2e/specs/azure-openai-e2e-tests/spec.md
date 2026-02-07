## ADDED Requirements

### Requirement: Opt-in Azure OpenAI e2e test command

The repository SHALL provide an opt-in command to run Azure OpenAI end-to-end tests without running them as part of the default unit test suite.

#### Scenario: Default unit tests remain offline

- **WHEN** a developer runs `pnpm -s test`
- **THEN** the test runner SHALL NOT execute any Azure OpenAI network calls

#### Scenario: E2E tests are explicit

- **WHEN** a developer runs `pnpm -s test:e2e`
- **THEN** the test runner SHALL execute the Azure OpenAI e2e tests

### Requirement: Environment-driven Azure OpenAI configuration

The Azure OpenAI e2e tests SHALL read configuration from environment variables and document them in `.env.example`.

#### Scenario: Missing API key produces actionable feedback

- **WHEN** `pnpm -s test:e2e` is executed without `OPENAI_API_KEY` set
- **THEN** the test run SHALL fail fast with a clear message explaining how to set required env vars

### Requirement: Azure OpenAI call returns usable text

The Azure OpenAI e2e tests SHALL call the configured Azure OpenAI deployment and assert that a non-empty text response is returned.

#### Scenario: Successful completion

- **WHEN** the Azure OpenAI deployment is reachable and correctly configured
- **THEN** the test SHALL pass after receiving a non-empty response
