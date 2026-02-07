## Why

MVP requires users to log in and have their mindmaps saved privately. Supabase Auth is the foundation for access control and persistence.

## What Changes

- Add Supabase SSR wiring for Next.js App Router (server/client helpers + middleware cookie handling).
- Add basic auth UI routes: `/login` and `/signup`.
- Add an authenticated landing route (e.g. `/mindmaps`) that redirects to `/login` when unauthenticated.

## Capabilities

### New Capabilities

- `user-auth`: Users can sign up, sign in, and maintain a session for protected pages.

### Modified Capabilities

- (none)

## Impact

- Frontend routes/components: auth pages, protected mindmaps page
- Infra/config: relies on `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
