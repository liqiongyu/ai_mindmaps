## 1. Database

- [x] 1.1 Add index for `(owner_id, updated_at, id)` to support fast keyset paging

## 2. API: Mindmaps list

- [x] 2.1 Implement cursor encode/decode + query parsing utilities
- [x] 2.2 Update `GET /api/mindmaps` to return `{ items, nextCursor, total }` with `cursor/limit/q`

## 3. Frontend: Mindmaps list

- [x] 3.1 Update `/mindmaps` to use paginated API + show total/page info
- [x] 3.2 Add debounced search input + empty state copy + “load more”

## 4. Canvas performance

- [x] 4.1 Refactor `MindmapCanvas` to compute layout only from `state/collapsedNodeIds`
- [x] 4.2 Ensure public viewer benefits (no behavior regressions)

## 5. Tests

- [x] 5.1 Unit tests for cursor parsing/encoding and list query behavior

## 6. Verification

- [x] 6.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`, `pnpm -s build`
