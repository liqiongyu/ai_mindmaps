## ADDED Requirements

### Requirement: A key user journey is covered by UI E2E

The repository MUST include at least one browser-driven E2E test that validates a key user journey end-to-end.

#### Scenario: Landing to Try to Edit to Export

- **WHEN** a user opens the landing page `/`
- **THEN** the user MUST be able to navigate to `/try`
- **WHEN** the user edits a node title in the try editor
- **THEN** the updated title MUST be visible on the canvas
- **WHEN** the user triggers an export action
- **THEN** the export MUST succeed (download triggered or UI indicates success without error)

### Requirement: UI E2E is self-contained and reliable

UI E2E tests MUST run headlessly, MUST have tolerant timeouts, and MUST not require external provider secrets to pass.

#### Scenario: Running UI E2E in CI

- **WHEN** UI E2E runs in GitHub Actions on PRs
- **THEN** it MUST pass without requiring Supabase/LLM secrets
- **AND** it MUST shut down any started dev server processes after completion
