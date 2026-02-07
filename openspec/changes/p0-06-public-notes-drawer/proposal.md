## Problem

The public read-only page is hard to consume when node notes (`notes`) are not easily accessible. For outline/meeting-notes/review scenarios, notes are a key part of the content.

## Goals (P0)

- On `/public/:slug`, clicking a node shows its notes.
- Provide a readable notes panel:
  - Desktop: right-side drawer/side panel.
  - Mobile: bottom sheet.
- Show a lightweight breadcrumb path for the selected node.
- Public page remains read-only and does not expose editor controls or chat.

## Acceptance criteria

- Clicking nodes on the public page shows notes if present (or an empty-state message).
- The public page does not show editing UI or chat.
