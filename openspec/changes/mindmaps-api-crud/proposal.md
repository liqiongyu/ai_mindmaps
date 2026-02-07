## Why

To meet MVP persistence and sharing flows, the app needs server-side APIs that create, load, save, and share mindmaps using Supabase with proper auth enforcement.

## What Changes

- Add Next.js route handlers for mindmap CRUD and save operations.
- Add a public read-only load endpoint for shared mindmaps (by `public_slug`).
- Add request/response schemas (Zod) and consistent error handling.

## Capabilities

### New Capabilities

- `mindmaps-api`: Authenticated mindmap CRUD + save endpoints, plus public read endpoint for shared mindmaps.

### Modified Capabilities

- (none)

## Impact

- New API routes under `src/app/api/` and supporting utilities under `src/lib/`.
- Requires the Supabase schema from `supabase/migrations/20260207000000_mindmap_storage.sql` to be applied in the Supabase project.
