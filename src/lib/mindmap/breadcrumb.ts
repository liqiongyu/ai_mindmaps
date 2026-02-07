import type { MindmapNode, MindmapState } from "./ops";

export function getMindmapNodeBreadcrumb(
  state: MindmapState,
  nodeId: string,
): Array<{ id: string; text: string }> {
  const items: Array<{ id: string; text: string }> = [];
  const seen = new Set<string>();

  let currentId: string | null = nodeId;
  while (currentId) {
    if (seen.has(currentId)) break;
    seen.add(currentId);

    const node: MindmapNode | undefined = state.nodesById[currentId];
    if (!node) break;

    items.push({ id: node.id, text: node.text });
    currentId = node.parentId;
  }

  return items.reverse();
}
