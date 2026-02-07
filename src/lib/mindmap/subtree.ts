import type { MindmapState } from "./ops";

export function getSubtreeNodeIds(state: MindmapState, rootId: string): Set<string> {
  const root = state.nodesById[rootId];
  if (!root) {
    throw new Error(`Node not found: ${rootId}`);
  }

  const childrenByParent = new Map<string, string[]>();
  for (const node of Object.values(state.nodesById)) {
    if (!node.parentId) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node.id);
    childrenByParent.set(node.parentId, list);
  }

  const result = new Set<string>();
  const stack: string[] = [rootId];
  while (stack.length) {
    const id = stack.pop();
    if (!id) continue;
    if (result.has(id)) continue;
    result.add(id);
    const children = childrenByParent.get(id);
    if (children) {
      for (const childId of children) stack.push(childId);
    }
  }

  return result;
}
