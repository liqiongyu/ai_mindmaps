## Why

Saving mindmaps currently uses a delete-then-insert sequence that can leave data partially saved (or empty) if an insert fails mid-flight. This is risky for the core user promise: “your mindmap is safely stored.”

## What Changes

- Add a database-side RPC that replaces a mindmap’s nodes in a single transaction.
- Update `POST /api/mindmaps/:id/save` to use the RPC when available, with a safe fallback.
- Ensure node inserts are parent-before-child to satisfy self-referential FK constraints reliably.

## Capabilities

### New Capabilities

- `mindmap-atomic-save`: Atomic mindmap save that updates mindmap metadata + node set as one transactional operation.

### Modified Capabilities

- (none)

## Impact

- Adds a Supabase migration with a Postgres function (RPC) for atomic replacement.
- Updates the save route handler and mindmap storage helpers.
- Adds unit coverage for deterministic node-row ordering (parent before child).
