## Why

We are starting to iterate on capabilities across multiple PRs. Seeding `openspec/specs/` with the current baseline specs enables future changes to correctly use **MODIFIED Requirements** instead of duplicating “new” capabilities in each change.

## What Changes

- Create baseline main spec files under `openspec/specs/` for the already-introduced capabilities:
  - `repo-ignores`
  - `azure-openai-e2e-tests`
  - `mindmap-canvas`

## Capabilities

### New Capabilities

- `openspec-main-specs`: Maintain canonical (main) specs under `openspec/specs/` as the source of truth across changes.

### Modified Capabilities

- (none)

## Impact

- Documentation/specs only (`openspec/specs/**`); no runtime code changes
