## Context

The current `/` route renders scaffold copy and a list of internal links. This does not support conversion (first-time users don’t understand the value proposition quickly, and there is no clear CTA to an editable experience).

The app uses Next.js App Router with Tailwind CSS. There is no UI component library, so the landing should be implemented with semantic HTML + Tailwind utility classes to keep dependencies minimal.

## Goals / Non-Goals

**Goals:**

- Replace the current scaffold home page with a product landing page that matches the P0-1 wireframe/copy in `docs/p0-p1-execution-plan.md`.
- Provide a clear, prominent primary CTA that routes to `/try`.
- Use zh-CN copy on the landing page and align page metadata with the product positioning.
- Keep implementation simple, accessible, and dependency-free.

**Non-Goals:**

- Implement the full try-mode editor experience (local draft, editing, export). This is delivered in P0-02.
- Add analytics/experimentation framework, i18n, or a global design system.
- Redesign authenticated pages (/login, /mindmaps, editor) beyond what is required for the landing page.

## Decisions

- Implement the landing content in `src/app/page.tsx` as a server component.
  - Rationale: purely static marketing content does not need client JS.
- Use native `<details>`/`<summary>` for the FAQ accordion.
  - Rationale: accessible by default and avoids client-side state.
- Add a minimal `/try` page for routing correctness.
  - Rationale: ensures the main CTA is never a 404 while the full /try editor is developed in the next change.

## Risks / Trade-offs

- [Risk] Copy inconsistency across the site during the transition. → Mitigation: landing copy follows `docs/p0-p1-execution-plan.md`; a later “copy unification” chore will align the rest of the app.
- [Risk] Landing UX feels too “marketing” compared to the editor. → Mitigation: keep the design minimal, focus on a single CTA, and avoid heavy visuals or animations.
