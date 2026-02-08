## Problem

The editor experience breaks down on small screens due to the fixed AI sidebar, and keyboard accessibility is incomplete (nodes are not reliably reachable/focusable for keyboard-only users). This hurts both core usability and baseline accessibility expectations.

## Goals (P0-02)

- On `<lg` screens, the persisted editor canvas MUST not be squeezed by a fixed sidebar.
- Provide an AI drawer/bottom sheet on mobile, opened via a clear `AI` button.
- Canvas nodes MUST be keyboard focusable and support keyboard-first editing (no double-click dependency).
- Global `focus-visible` styling and a skip-link MUST exist across primary paths.
- `Esc` MUST close the AI drawer and modals/overlays.

## Non-goals

- Full WAI-ARIA tree navigation (arrow-key traversal) for mindmap nodes.
- A complete automated a11y audit suite (covered by later QA work).

## Approach

1. Update `MindmapChatSidebar` to support `desktop | drawer` rendering.
2. Add a mobile `AI` button in the editor header to toggle the drawer.
3. Make `MindmapCanvas` node renderers keyboard focusable (`role="button"`, `tabIndex={0}`) and select-on-focus.
4. Add global `focus-visible` styles and a skip link in `layout.tsx`.

## Acceptance criteria

- On screens `<lg`, the canvas uses the full width (AI is in a drawer).
- Nodes can be focused via keyboard, selected on focus, and edited via keyboard shortcuts (F2).
- All primary controls have a consistent `focus-visible` affordance.
- `Esc` closes the drawer and modal overlays.
