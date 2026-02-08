## ADDED Requirements

### Requirement: Vitest coverage collection is enabled

The codebase MUST support running Vitest with coverage collection enabled via a dedicated script.

#### Scenario: Running coverage locally

- **WHEN** a developer runs `pnpm -s test:coverage`
- **THEN** Vitest MUST collect coverage using the v8 provider
- **AND** the command MUST fail if coverage thresholds are not met

### Requirement: Coverage thresholds are enforced in CI

CI MUST enforce minimum coverage thresholds to prevent untested changes from being merged.

#### Scenario: CI fails when below thresholds

- **WHEN** coverage for a scoped directory falls below its configured minimum
- **THEN** CI MUST fail with a clear signal that coverage thresholds were not met

### Requirement: Thresholds support module-specific minima

Coverage thresholds MUST support specifying different minima for different modules using glob patterns.

#### Scenario: Different thresholds per module

- **WHEN** coverage configuration is evaluated
- **THEN** `src/lib/mindmap/**` MUST enforce a higher minimum than `src/app/api/**`
