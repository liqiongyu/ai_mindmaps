## Context

- MVP requires exporting the mindmap as PNG and SVG.
- The editor renders the mindmap via `@xyflow/react` (React Flow) inside the browser.
- Export should reflect the current mindmap state (including any collapsed/expanded state) and produce a downloadable file.

## Goals / Non-Goals

**Goals:**

- Provide in-editor actions to export PNG and SVG.
- Generate a non-empty image/file that can be opened by common tools.
- Prefer exporting the full mindmap bounds rather than the current viewport (to avoid “blank export” when panned/zoomed).

**Non-Goals:**

- Pixel-perfect styling parity across all SVG viewers.
- Server-side rendering/export.
- Advanced export settings (scale, margins, custom themes).

## Decisions

- Use a DOM-to-image approach (e.g., `html-to-image`) to generate PNG and SVG from the React Flow viewport.
- Export the full graph bounds by computing a fitted viewport transform from React Flow node bounds.
- Trigger downloads client-side via a temporary `<a download>` link.
- Keep export logic in a small client-side helper and expose it to the editor via a canvas ref/handle.

## Risks / Trade-offs

- [SVG export may rely on `foreignObject` rendering] → Mitigation: still provide PNG as the reliable fallback; keep SVG output simple and validate it opens in common viewers.
- [Large graphs can slow export] → Mitigation: keep MVP graphs modest and use reasonable dimensions/padding.
- [UI overlays captured in export] → Mitigation: capture only the React Flow viewport element (not the editor chrome/controls).
