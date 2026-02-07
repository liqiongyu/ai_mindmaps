## 1. Supabase SQL Schema

- [x] 1.1 Add `supabase/migrations/` with a migration that creates `mindmaps` + `mindmap_nodes`
- [x] 1.2 Add `updated_at` trigger and required indexes

## 2. Row Level Security (RLS)

- [x] 2.1 Enable RLS on `mindmaps` and `mindmap_nodes`
- [x] 2.2 Add owner-only CRUD policies for private mindmaps/nodes
- [x] 2.3 Add anonymous read policy for public mindmaps/nodes

## 3. Developer Documentation

- [x] 3.1 Document how to apply the migration in the Supabase dashboard SQL editor
- [x] 3.2 Add a lightweight script to sanity-check table existence via Supabase REST
