## Problem

Sharing exists but is not productized into clear “private vs public (unlisted)” semantics. Users cannot easily see current share status, refresh/rotate links, or stop sharing.

## Goals (P0)

- In the editor, clearly show share status:
  - `私有（仅我可见）`
  - `公开（持链接可见，只读）`
- Provide actions:
  - Generate / refresh link
  - Copy link
  - Stop sharing (invalidate old link)
- Provide clear copy:
  - Public page does not include chat or AI ops

## Non-goals (P0)

- Search-indexed public pages (this is Unlisted-by-link only).
- Granular access control / password protection.

## Acceptance criteria

- Users can tell at a glance whether the mindmap is public, where the link is, and how to invalidate it.
- Public page does not expose chat threads/messages or raw ops (already true).
