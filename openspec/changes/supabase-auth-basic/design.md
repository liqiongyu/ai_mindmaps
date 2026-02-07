## Context

The app currently has no authentication. Supabase Auth is already in dependencies (`@supabase/ssr`, `@supabase/supabase-js`), but wiring is not implemented. We need a minimal, correct SSR setup for Next.js App Router so sessions persist via cookies and protected routes can enforce auth.

## Goals / Non-Goals

**Goals:**

- Add Supabase server/client helper utilities for App Router.
- Add `middleware.ts` to keep auth cookies in sync (session refresh).
- Implement `/login` and `/signup` pages (email/password).
- Implement a protected `/mindmaps` page that redirects to `/login` when unauthenticated.

**Non-Goals:**

- Mindmap database schema and persistence (separate change).
- Password reset, magic link, OAuth providers.
- Fine-grained authorization beyond “user is logged in”.

## Decisions

- Use `@supabase/ssr` helpers:
  - `createBrowserClient` for client components (login/signup)
  - `createServerClient` for server components/route handlers
- Use `src/middleware.ts` to refresh the session and write updated cookies on navigation.
- Enforce auth for `/mindmaps` in the server component (read user; redirect if missing).

## Risks / Trade-offs

- [Risk] SSR cookie handling is easy to get wrong. → Mitigation: follow Supabase SSR patterns and centralize cookie read/write in one helper.
