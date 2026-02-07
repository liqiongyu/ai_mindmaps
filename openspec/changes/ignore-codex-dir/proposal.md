## Why

Local development (and agent runs) often create a `.codex/` directory inside the repo. Today, `pnpm format:check` (Prettier) scans it and fails pre-commit, which blocks normal commit workflows.

## What Changes

- Ignore `.codex/` in Prettier so `pnpm format:check` only enforces formatting on tracked project files.
- Ignore `.codex/` in git to avoid accidentally committing agent/tooling artifacts.

## Capabilities

### New Capabilities

- `repo-ignores`: Standardize ignored paths for developer tooling artifacts (starting with `.codex/`) across formatting and git.

### Modified Capabilities

- (none)

## Impact

- Tooling/config: `.prettierignore`, `.gitignore`
- Developer workflow: pre-commit hooks become reliable when `.codex/` exists locally
