## Purpose

Ensure developer/tooling artifacts created in local environments do not break repository checks or get accidentally committed.

## Requirements

### Requirement: Prettier ignores `.codex/`

The repository SHALL configure Prettier to ignore the `.codex/` directory so local tooling artifacts do not break `pnpm format:check`.

#### Scenario: `.codex/` exists locally

- **WHEN** `.codex/` exists in the repo working directory
- **THEN** running `pnpm -s format:check` SHALL NOT fail due to files under `.codex/`

### Requirement: Git ignores `.codex/`

The repository SHALL include `.codex/` in `.gitignore` to prevent accidental commits of tooling artifacts.

#### Scenario: `git status` does not report `.codex/`

- **WHEN** `.codex/` exists in the repo working directory
- **THEN** `git status --porcelain=v1` SHALL NOT report any paths under `.codex/`
