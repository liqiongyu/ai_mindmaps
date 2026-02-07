## Why

MVP requires exporting the current mindmap as PNG and SVG for sharing in slides/docs and offline use. Today there is no export capability, forcing users to rely on screenshots.

## What Changes

- Add “Export PNG” and “Export SVG” actions to the mindmap editor.
- Export output is generated from the current canvas rendering (respecting the current folded/expanded state).
- Download a non-empty file that can be opened by common tools.

## Capabilities

### New Capabilities

- `mindmap-export`: Export the mindmap canvas to PNG and SVG files from the editor UI.

### Modified Capabilities

- (none)

## Impact

- Adds a small client-side export implementation and wiring in the editor UI.
- Likely introduces a DOM-to-image dependency for PNG/SVG generation.
- Adds lightweight verification for export helpers (unit tests where feasible).
