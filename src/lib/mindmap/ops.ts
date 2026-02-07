import { z } from "zod";

export const OperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add_node"),
    nodeId: z.string().min(1),
    parentId: z.string().min(1),
    text: z.string().min(1),
    index: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal("rename_node"),
    nodeId: z.string().min(1),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("update_notes"),
    nodeId: z.string().min(1),
    notes: z.string(),
  }),
  z.object({
    type: z.literal("move_node"),
    nodeId: z.string().min(1),
    newParentId: z.string().min(1),
    index: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal("delete_node"),
    nodeId: z.string().min(1),
  }),
  z.object({
    type: z.literal("reorder_children"),
    parentId: z.string().min(1),
    orderedChildIds: z.array(z.string().min(1)).min(0),
  }),
]);

export type Operation = z.infer<typeof OperationSchema>;

export type MindmapNode = {
  id: string;
  parentId: string | null;
  text: string;
  notes: string | null;
  orderIndex: number;
};

export type MindmapState = {
  rootNodeId: string;
  nodesById: Record<string, MindmapNode>;
};

export function applyOperations(state: MindmapState, operations: Operation[]): MindmapState {
  const next: MindmapState = {
    rootNodeId: state.rootNodeId,
    nodesById: structuredClone(state.nodesById),
  };

  for (const operation of operations) {
    switch (operation.type) {
      case "add_node": {
        if (!next.nodesById[operation.parentId]) {
          throw new Error(`Parent node not found: ${operation.parentId}`);
        }
        if (next.nodesById[operation.nodeId]) {
          throw new Error(`Node already exists: ${operation.nodeId}`);
        }
        const siblings = getChildren(next.nodesById, operation.parentId);
        const insertIndex = operation.index ?? siblings.length;
        bumpOrderIndices(next.nodesById, operation.parentId, insertIndex);
        next.nodesById[operation.nodeId] = {
          id: operation.nodeId,
          parentId: operation.parentId,
          text: operation.text,
          notes: null,
          orderIndex: insertIndex,
        };
        break;
      }
      case "rename_node": {
        const node = next.nodesById[operation.nodeId];
        if (!node) throw new Error(`Node not found: ${operation.nodeId}`);
        node.text = operation.text;
        break;
      }
      case "update_notes": {
        const node = next.nodesById[operation.nodeId];
        if (!node) throw new Error(`Node not found: ${operation.nodeId}`);
        node.notes = operation.notes;
        break;
      }
      case "move_node": {
        if (operation.nodeId === next.rootNodeId) {
          throw new Error("Cannot move root node");
        }
        const node = next.nodesById[operation.nodeId];
        if (!node) throw new Error(`Node not found: ${operation.nodeId}`);
        if (!next.nodesById[operation.newParentId]) {
          throw new Error(`New parent node not found: ${operation.newParentId}`);
        }
        if (isDescendant(next.nodesById, operation.newParentId, operation.nodeId)) {
          throw new Error("Cannot move a node into its descendant");
        }

        const oldParentId = node.parentId;
        const siblings = getChildren(next.nodesById, operation.newParentId);
        const insertIndex = operation.index ?? siblings.length;
        bumpOrderIndices(next.nodesById, operation.newParentId, insertIndex);

        node.parentId = operation.newParentId;
        node.orderIndex = insertIndex;

        if (oldParentId) {
          normalizeOrderIndices(next.nodesById, oldParentId);
        }
        break;
      }
      case "delete_node": {
        if (operation.nodeId === next.rootNodeId) {
          throw new Error("Cannot delete root node");
        }
        const node = next.nodesById[operation.nodeId];
        if (!node) throw new Error(`Node not found: ${operation.nodeId}`);
        const parentId = node.parentId;
        for (const id of getSubtreeIds(next.nodesById, operation.nodeId)) {
          delete next.nodesById[id];
        }
        if (parentId) normalizeOrderIndices(next.nodesById, parentId);
        break;
      }
      case "reorder_children": {
        if (!next.nodesById[operation.parentId]) {
          throw new Error(`Parent node not found: ${operation.parentId}`);
        }
        const currentChildren = getChildren(next.nodesById, operation.parentId).map((n) => n.id);
        const ordered = operation.orderedChildIds;
        if (ordered.length !== currentChildren.length) {
          throw new Error("reorder_children must include all current children");
        }
        const currentSet = new Set(currentChildren);
        for (const id of ordered) {
          if (!currentSet.has(id)) throw new Error(`Child not found under parent: ${id}`);
        }
        ordered.forEach((id, index) => {
          next.nodesById[id].orderIndex = index;
        });
        break;
      }
      default: {
        // Exhaustiveness check
        const _never: never = operation;
        throw new Error(`Unknown operation: ${JSON.stringify(_never)}`);
      }
    }
  }

  return next;
}

function getChildren(nodesById: Record<string, MindmapNode>, parentId: string): MindmapNode[] {
  const children: MindmapNode[] = [];
  for (const node of Object.values(nodesById)) {
    if (node.parentId === parentId) children.push(node);
  }
  children.sort((a, b) => a.orderIndex - b.orderIndex);
  return children;
}

function bumpOrderIndices(
  nodesById: Record<string, MindmapNode>,
  parentId: string,
  fromIndex: number,
) {
  for (const node of Object.values(nodesById)) {
    if (node.parentId === parentId && node.orderIndex >= fromIndex) {
      node.orderIndex += 1;
    }
  }
}

function normalizeOrderIndices(nodesById: Record<string, MindmapNode>, parentId: string) {
  const children = getChildren(nodesById, parentId);
  children.forEach((node, index) => {
    node.orderIndex = index;
  });
}

function getSubtreeIds(nodesById: Record<string, MindmapNode>, rootId: string): string[] {
  const result: string[] = [];
  const stack: string[] = [rootId];
  while (stack.length) {
    const id = stack.pop();
    if (!id) break;
    const node = nodesById[id];
    if (!node) continue;
    result.push(id);
    for (const child of Object.values(nodesById)) {
      if (child.parentId === id) stack.push(child.id);
    }
  }
  return result;
}

function isDescendant(
  nodesById: Record<string, MindmapNode>,
  maybeDescendantId: string,
  ancestorId: string,
): boolean {
  let currentId: string | null | undefined = maybeDescendantId;
  while (currentId) {
    if (currentId === ancestorId) return true;
    currentId = nodesById[currentId]?.parentId;
  }
  return false;
}
