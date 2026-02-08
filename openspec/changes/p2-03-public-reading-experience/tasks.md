## 1. Dependencies

- [x] 1.1 Add safe Markdown rendering dependencies (`react-markdown`, `remark-gfm`, `rehype-sanitize`)
- [x] 1.2 Add `SafeMarkdown` UI helper for public notes rendering

## 2. Backend

- [x] 2.1 Extend `GET /api/public/:slug` to accept `nodeId` (and alias `node`) and return `focusedNode` + `breadcrumb`
- [x] 2.2 Add OG image generator route (e.g. `GET /api/og/public/:slug`)
- [x] 2.3 Add `/public/:slug` `generateMetadata` to set title/description and `og:image`

## 3. Frontend (Public Page)

- [x] 3.1 Render notes with safe Markdown (replace `whitespace-pre-wrap` plain text)
- [x] 3.2 Support deep link selection (`?node=`) on load (select + open notes + breadcrumb)
- [x] 3.3 Add “复制当前节点链接” action (clipboard + toast)
- [x] 3.4 Add breadcrumb path navigation UI (click to jump ancestors)
- [x] 3.5 Add canvas focus-on-node for deep link (best-effort) and keep selection highlight

## 4. Tests

- [x] 4.1 Update API tests for `/api/public/[slug]` to cover `nodeId` focus behavior
- [x] 4.2 Add API test for OG image route (status + content-type)

## 5. Verification

- [x] 5.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`
- [x] 5.2 Verify `pnpm -s test` and `pnpm -s build` (best-effort)
