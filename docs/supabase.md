# Supabase Setup (MVP)

This repo uses **hosted Supabase** for Auth + Postgres storage.

## Required env vars

Set these in `.env.local` (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Apply database schema + RLS

1. Open Supabase Dashboard → **SQL Editor**
2. Create a new query
3. Paste the contents of:
   - `supabase/migrations/20260207000000_mindmap_storage.sql`
4. Run the query

After this, the project has:

- `mindmaps` table
- `mindmap_nodes` table
- RLS policies (owner-only CRUD; public read when `is_public=true`)

## Sanity check

Run:

```bash
pnpm -s supabase:check
```

Expected:

- `mindmaps` and `mindmap_nodes` should report `OK`
- If you still see `PGRST205` table-not-found errors, the SQL migration has not been applied yet
