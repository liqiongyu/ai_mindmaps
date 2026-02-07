## Why

The current home page is still scaffold copy and does not communicate MMA’s core differentiation within the first 10 seconds. We need a productized landing page that clearly explains “chat-driven, controllable (ops) mindmaps” and drives first-time users into an editable experience.

## What Changes

- Replace `/` with a marketing landing page:
  - Minimal top navigation (Logo + primary CTA + login/signup)
  - Hero section with clear value proposition and supporting bullets
  - “30 seconds to get started” section
  - Collapsible FAQ and a lightweight privacy statement
- Ensure all copy on the landing page is in zh-CN and consistent with `docs/p0-p1-execution-plan.md`.
- Add a minimal `/try` route so the primary CTA always lands on a valid page (the full try-mode editor is implemented in a subsequent change).

## Capabilities

### New Capabilities

- `homepage-landing`: Productized marketing landing page that guides users to a first editable experience (`/try`), with consistent zh-CN messaging.

### Modified Capabilities

- (none)

## Impact

- Frontend routes/layout: `src/app/page.tsx`, `src/app/layout.tsx`, new `src/app/try/page.tsx`
- Product copy changes (zh-CN) for the landing page and document metadata
