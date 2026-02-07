## Why

MVP requires users to generate a public, read-only link for a mindmap and let others view it without logging in. We already have the backend share APIs, but no UI to trigger sharing and no public page to render the shared mindmap.

## What Changes

- Add a public read-only page route: `/public/:slug`
- Add a “Share” action in the editor to generate/refresh `public_slug`
- Update the mindmaps list to show share links for public mindmaps

## Capabilities

### New Capabilities

- `mindmaps-sharing`: Public share link generation and read-only viewing.

### Modified Capabilities

- (none)

## Impact

- Adds new routes under `src/app/public/`.
- Updates editor and list UI under `src/app/mindmaps/`.
