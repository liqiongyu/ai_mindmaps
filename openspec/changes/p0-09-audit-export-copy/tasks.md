## 1. UI Copy (Usage / Pricing)

- [x] 1.1 Update `src/app/mindmaps/page.tsx` usage labels (`audit_export` -> 审计导出(JSON))
- [x] 1.2 Update `src/app/pricing/page.tsx` plan copy to match usage wording and clarify PNG/SVG is separate

## 2. AI Panel Copy

- [x] 2.1 Update AI panel export button label and add JSON clarification
- [x] 2.2 Update AI panel quota error fallback copy for audit export

## 3. API Copy

- [x] 3.1 Update `/api/ai/chat/export` quota exceeded message to “审计导出” wording
- [x] 3.2 Add/adjust unit test to assert the quota exceeded message is correct

## 4. Verification

- [x] 4.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
