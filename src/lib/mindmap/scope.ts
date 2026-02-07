import type { MindmapState, Operation } from "./ops";
import { getSubtreeNodeIds } from "./subtree";

export type AiScope = "global" | "node";

export function validateOperationsScope(args: {
  state: MindmapState;
  scope: AiScope;
  selectedNodeId?: string;
  operations: Operation[];
}): { ok: true } | { ok: false; message: string } {
  const { state, scope, selectedNodeId, operations } = args;

  if (scope === "global") {
    return { ok: true };
  }

  if (!selectedNodeId) {
    return { ok: false, message: "selectedNodeId is required for node scope" };
  }

  let allowed: Set<string>;
  try {
    allowed = getSubtreeNodeIds(state, selectedNodeId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid selectedNodeId";
    return { ok: false, message };
  }

  const isAllowed = (id: string) => allowed.has(id);
  const requireAllowed = (id: string, reason: string) => {
    if (!isAllowed(id)) {
      return { ok: false as const, message: `${reason}: ${id}` };
    }
    return null;
  };

  for (const op of operations) {
    switch (op.type) {
      case "add_node": {
        const err = requireAllowed(op.parentId, "add_node parentId outside scope");
        if (err) return err;
        allowed.add(op.nodeId);
        break;
      }
      case "rename_node": {
        const err = requireAllowed(op.nodeId, "rename_node nodeId outside scope");
        if (err) return err;
        break;
      }
      case "update_notes": {
        const err = requireAllowed(op.nodeId, "update_notes nodeId outside scope");
        if (err) return err;
        break;
      }
      case "move_node": {
        const err1 = requireAllowed(op.nodeId, "move_node nodeId outside scope");
        if (err1) return err1;
        const err2 = requireAllowed(op.newParentId, "move_node newParentId outside scope");
        if (err2) return err2;
        break;
      }
      case "delete_node": {
        const err = requireAllowed(op.nodeId, "delete_node nodeId outside scope");
        if (err) return err;
        break;
      }
      case "reorder_children": {
        const err = requireAllowed(op.parentId, "reorder_children parentId outside scope");
        if (err) return err;
        for (const id of op.orderedChildIds) {
          const errChild = requireAllowed(id, "reorder_children childId outside scope");
          if (errChild) return errChild;
        }
        break;
      }
      default: {
        const _exhaustive: never = op;
        return { ok: false, message: `Unknown operation: ${JSON.stringify(_exhaustive)}` };
      }
    }
  }

  return { ok: true };
}
