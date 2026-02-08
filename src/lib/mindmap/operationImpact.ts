import type { MindmapState, Operation } from "./ops";
import { getSubtreeNodeIds } from "./subtree";

export type DeleteImpact = {
  nodes: number;
};

export function computeDeleteImpact(
  state: MindmapState,
  operations: readonly Operation[],
): DeleteImpact {
  const impacted = new Set<string>();

  for (const op of operations) {
    if (op.type !== "delete_node") continue;
    if (!state.nodesById[op.nodeId]) continue;

    const subtree = getSubtreeNodeIds(state, op.nodeId);
    for (const id of subtree) impacted.add(id);
  }

  return { nodes: impacted.size };
}
