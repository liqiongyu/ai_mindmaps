import type { Operation } from "./ops";

export type OperationSummary = {
  add: number;
  rename: number;
  move: number;
  delete: number;
  reorder: number;
};

export type OperationHighlightKind = "add" | "rename" | "move";

export function summarizeOperations(operations: readonly Operation[]): OperationSummary {
  const summary: OperationSummary = { add: 0, rename: 0, move: 0, delete: 0, reorder: 0 };

  for (const op of operations) {
    switch (op.type) {
      case "add_node":
        summary.add += 1;
        break;
      case "rename_node":
        summary.rename += 1;
        break;
      case "move_node":
        summary.move += 1;
        break;
      case "delete_node":
        summary.delete += 1;
        break;
      case "reorder_children":
        summary.reorder += 1;
        break;
      case "update_notes":
        break;
      default: {
        const _exhaustive: never = op;
        return _exhaustive;
      }
    }
  }

  return summary;
}

export function hasDeleteNodeOperation(operations: readonly Operation[]): boolean {
  return operations.some((op) => op.type === "delete_node");
}

export function deriveOperationHighlights(
  operations: readonly Operation[],
): Record<string, OperationHighlightKind> {
  const highlights: Record<string, OperationHighlightKind> = {};
  const priority: Record<OperationHighlightKind, number> = { move: 1, rename: 2, add: 3 };

  for (const op of operations) {
    const next =
      op.type === "add_node"
        ? ({ nodeId: op.nodeId, kind: "add" } as const)
        : op.type === "rename_node"
          ? ({ nodeId: op.nodeId, kind: "rename" } as const)
          : op.type === "move_node"
            ? ({ nodeId: op.nodeId, kind: "move" } as const)
            : null;
    if (!next) continue;

    const existing = highlights[next.nodeId];
    if (!existing || priority[next.kind] > priority[existing]) {
      highlights[next.nodeId] = next.kind;
    }
  }

  return highlights;
}
