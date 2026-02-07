# Repository Guidelines

## Project Structure & Module Organization

- `src/app/` — Next.js App Router routes and UI (`page.tsx`, `layout.tsx`)
- `src/app/api/**/route.ts` — API route handlers (mindmaps, sharing, AI chat)
- `src/lib/` — core logic: `mindmap/`, `ai/`, `supabase/`, `llm/`
- `src/e2e/` — provider-backed E2E tests
- `supabase/migrations/` — SQL schema + RLS (see `docs/supabase.md`)
- `docs/` — product + infra docs (start with `docs/prd.md`)

## Build, Test, and Development Commands

```bash
corepack enable
pnpm install
pnpm dev
```

- Node `20.x` (see `.nvmrc`), package manager `pnpm`
- `pnpm build` / `pnpm start` — production build + server
- `pnpm format:check` / `pnpm format:write` — Prettier checks/format
- `pnpm lint` / `pnpm typecheck` — ESLint / TypeScript strict mode
- `pnpm test` / `pnpm test:e2e` — Vitest unit vs E2E suites
- `pnpm supabase:check` — sanity-check required tables (needs Supabase env vars)

## Coding Style & Naming Conventions

- Indent 2 spaces; LF; final newline (see `.editorconfig`)
- Formatting via Prettier (`printWidth: 100`) + Tailwind class sorting
- Naming: components `PascalCase.tsx`; modules `camelCase.ts`; tests `*.test.ts`, E2E `*.e2e.test.ts`
- Imports: prefer `@/*` alias for `src/*` (e.g. `@/lib/mindmap/ops`)

## Testing Guidelines

- Unit tests: colocate with code under `src/**` and keep them fast/deterministic.
- E2E tests: may call Azure OpenAI; keep them opt-in via env vars and tolerant timeouts.

## Commit & Pull Request Guidelines

- Commits follow Conventional Commits (enforced by commitlint), e.g. `feat(canvas): left/right layout`.
- Workflow is trunk-based: branch from `main`, open a PR, and merge via GitHub.
- Follow `.github/pull_request_template.md`; add screenshots for UI changes and migration/rollback notes for DB/RLS changes.
- Hooks/CI run `format:check`, `lint`, `typecheck`, and `test` (see `lefthook.yml`, `.github/workflows/ci.yml`).

## Agent & Automation Rules

- GitHub operations: use GitHub CLI (`gh`) for issues/PRs/checks/releases.
- Vercel operations: use Vercel MCP (`mcp__vercel__*`) for deploys, logs, and project settings.
- Supabase operations: use Supabase MCP (`mcp__supabase__*`) for SQL, migrations, and Edge Functions.
- E2E automation for new features: use Chrome DevTools MCP (`mcp__chrome-devtools__*`) to run/record browser flows.
- Default: try MCP/tools or existing API routes first; only ask the user to do manual console/dashboard steps when MCP/API is blocked (auth/permissions/unsupported action).

## Security & Configuration Tips

- Copy `.env.example` → `.env.local`; never commit real keys.
- Required: Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Optional: LLM provider (`MMA_LLM_*`) and Azure OpenAI for E2E (`OPENAI_API_KEY`, `AZURE_OPENAI_*`).
