## Context

- Share-related backend endpoints already exist:
  - `POST /api/mindmaps/:id/share`
  - `GET /api/public/:slug`
- RLS policies allow public reads for mindmaps/nodes where `is_public = true`.

## Goals / Non-Goals

**Goals:**

- Provide a public page route `/public/:slug` that renders a shared mindmap read-only.
- Add an editor UI action to generate/refresh the share link and copy it easily.
- Surface share links in the authenticated mindmaps list for already-public mindmaps.

**Non-Goals:**

- Permissions beyond owner/public (no collaborators in MVP).
- Public page SEO/metadata polish beyond basic correctness.

## Decisions

- **Public page data loading:** fetch mindmap + nodes server-side using Supabase with the anon key, then render a lightweight client viewer using the existing `MindmapCanvas`.
- **Share link generation:** editor calls the existing share API and displays the resulting URL; repeated use refreshes slug (invalidating old links).

## Risks / Trade-offs

- Public reads are currently gated by `is_public = true` and can be enumerated; acceptable for MVP (tighten later if needed).
