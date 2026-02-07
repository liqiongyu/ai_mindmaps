## 1. Mindmaps List Page

- [x] 1.1 Update `/mindmaps` to render the current user's mindmaps list
- [x] 1.2 Add “New mindmap” button that creates and navigates to the editor

## 2. Persisted Editor

- [x] 2.1 Protect `/mindmaps/:id` server-side (redirect to `/login` if not authed)
- [x] 2.2 Update `MindmapEditor` to support persisted mode (load via API + autosave)
- [x] 2.3 Add editor save status UI (saving/saved/error)

## 3. Demo Route

- [x] 3.1 Add `/mindmaps/demo` route that renders the editor in demo mode

## 4. Verification

- [x] 4.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
