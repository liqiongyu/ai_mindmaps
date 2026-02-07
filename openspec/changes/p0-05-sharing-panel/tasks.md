## 1. API changes

- [x] 1.1 Extend `GET /api/mindmaps/:id` to include `isPublic` + `publicSlug`
- [x] 1.2 Add `DELETE /api/mindmaps/:id/share` to stop sharing (clear slug)

## 2. Editor UI

- [x] 2.1 Render share status strip (private/public)
- [x] 2.2 Support generate/refresh/copy/stop actions with clear messaging and confirm

## 3. Verification

- [x] 3.1 Verify public page returns 404 after stop sharing
- [x] 3.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, and `pnpm -s test` pass
