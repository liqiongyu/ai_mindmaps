import type { MindmapState } from "./ops";
import type { MindmapUiState } from "./uiState";

type IdGenerator = () => string;

export function remapMindmapStateIds(
  state: MindmapState,
  generateId: IdGenerator = () => crypto.randomUUID(),
): { state: MindmapState; idMap: Record<string, string> } {
  const idMap: Record<string, string> = {};
  for (const id of Object.keys(state.nodesById)) {
    idMap[id] = generateId();
  }

  const nodesById: MindmapState["nodesById"] = {};
  for (const [oldNodeId, node] of Object.entries(state.nodesById)) {
    const nextId = idMap[oldNodeId];
    const parentId = node.parentId ? idMap[node.parentId] : null;
    nodesById[nextId] = {
      ...node,
      id: nextId,
      parentId,
    };
  }

  return { state: { rootNodeId: idMap[state.rootNodeId], nodesById }, idMap };
}

export function remapMindmapUiStateIds(
  ui: MindmapUiState,
  idMap: Record<string, string>,
): MindmapUiState {
  return {
    ...ui,
    selectedNodeId: ui.selectedNodeId ? (idMap[ui.selectedNodeId] ?? null) : null,
    collapsedNodeIds: ui.collapsedNodeIds
      .map((id) => idMap[id])
      .filter((id): id is string => Boolean(id)),
  };
}
