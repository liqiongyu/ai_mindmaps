## 1. Open pages

- [ ] 1.1 Add `/privacy` page with structured policy content
- [ ] 1.2 Add `/security` page with security practices + scope disclaimers
- [ ] 1.3 Add `/trust` page linking to privacy/security and summarizing key promises
- [ ] 1.4 Update homepage footer to link to `/privacy` and `/security`

## 2. Data retention & deletion policy

- [ ] 2.1 Document retention/deletion behavior to match current product (delete mindmap, stop sharing, cascade deletes)
- [ ] 2.2 Add links from trust pages to the relevant in-product controls (`/mindmaps`, editor share controls)

## 3. Audit export verification

- [ ] 3.1 Add/update tests for `/api/ai/chat/export` permission boundary (non-owner gets 404)
- [ ] 3.2 Verify audit export payload includes required metadata fields

## 4. Verification

- [ ] 4.1 Run `pnpm test:coverage`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`
- [ ] 4.2 Ensure pages are accessible and copy matches execution plan
