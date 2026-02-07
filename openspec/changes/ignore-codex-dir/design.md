## Context

This repo is used with local developer tooling and agent runs that may create a `.codex/` directory under the project root. Prettier currently checks the whole working tree (`prettier --check .`) and therefore includes `.codex/`, causing pre-commit `format_check` to fail even though `.codex/` is not part of the product code.

## Goals / Non-Goals

**Goals:**

- Make `pnpm -s format:check` reliable even when `.codex/` exists locally.
- Ensure `.codex/` is not accidentally committed.

**Non-Goals:**

- Formatting or enforcing style within `.codex/` (tooling-owned content).
- Changing CI behavior beyond excluding `.codex/` from Prettier’s scan.

## Decisions

- Add `.codex/` to `.prettierignore`.
  - Rationale: keeps formatting enforcement focused on product files and avoids pre-commit friction.
  - Alternatives considered: running Prettier only on tracked files (more complex; requires custom scripting and varies by environment).
- Add `.codex/` to `.gitignore`.
  - Rationale: prevents accidental staging/commits of local tooling artifacts.

## Risks / Trade-offs

- [Risk] Developers may put real code under `.codex/` and it won’t be formatted/linted. → Mitigation: `.codex/` is reserved for tooling; product code stays under `src/`, `docs/`, etc.
