## UI behavior

### Desktop (lg+)

- Layout: canvas on the left, notes side panel on the right (`w-80`).
- Side panel content:
  - Title: `节点备注`
  - Node title
  - Breadcrumb path (muted)
  - Notes content (plain text for P0; markdown rendering can be added later)
  - Empty state: `该节点暂无备注。`

### Mobile

- Show a bottom sheet when a node is selected.
- Provide a close button; closing clears the selected node.

## Breadcrumb computation

Given `MindmapState.nodesById`, compute the path from selected node to root by walking `parentId` until null, then reverse for display. Missing parents should stop traversal safely.
