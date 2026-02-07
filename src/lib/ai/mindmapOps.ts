import type { MindmapState, Operation } from "../mindmap/ops";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function generateUniqueUuid(used: Set<string>): string {
  let id = crypto.randomUUID();
  while (used.has(id)) {
    id = crypto.randomUUID();
  }
  used.add(id);
  return id;
}

export function normalizeAiMindmapOperationIds(args: {
  state: MindmapState;
  operations: Operation[];
}): { ok: true; operations: Operation[] } | { ok: false; message: string } {
  const { state, operations } = args;

  const existingIds = new Set(Object.keys(state.nodesById));
  const usedIds = new Set(existingIds);
  const idMap = new Map<string, string>();
  const seenAddNodeIds = new Set<string>();

  for (const op of operations) {
    if (op.type !== "add_node") continue;

    if (existingIds.has(op.nodeId)) {
      return { ok: false, message: `add_node nodeId must be new: ${op.nodeId}` };
    }
    if (seenAddNodeIds.has(op.nodeId)) {
      return { ok: false, message: `Duplicate add_node nodeId: ${op.nodeId}` };
    }
    seenAddNodeIds.add(op.nodeId);

    idMap.set(op.nodeId, generateUniqueUuid(usedIds));
  }

  const mapId = (id: string) => idMap.get(id) ?? id;

  const nextOperations: Operation[] = operations.map((op) => {
    switch (op.type) {
      case "add_node":
        return { ...op, nodeId: mapId(op.nodeId), parentId: mapId(op.parentId) };
      case "rename_node":
        return { ...op, nodeId: mapId(op.nodeId) };
      case "update_notes":
        return { ...op, nodeId: mapId(op.nodeId) };
      case "move_node":
        return { ...op, nodeId: mapId(op.nodeId), newParentId: mapId(op.newParentId) };
      case "delete_node":
        return { ...op, nodeId: mapId(op.nodeId) };
      case "reorder_children":
        return {
          ...op,
          parentId: mapId(op.parentId),
          orderedChildIds: op.orderedChildIds.map(mapId),
        };
      default: {
        const _exhaustive: never = op;
        return _exhaustive;
      }
    }
  });

  const invalidIds: string[] = [];
  const checkUuid = (id: string) => {
    if (!isUuid(id)) invalidIds.push(id);
  };

  for (const op of nextOperations) {
    switch (op.type) {
      case "add_node":
        checkUuid(op.nodeId);
        checkUuid(op.parentId);
        break;
      case "rename_node":
      case "update_notes":
      case "delete_node":
        checkUuid(op.nodeId);
        break;
      case "move_node":
        checkUuid(op.nodeId);
        checkUuid(op.newParentId);
        break;
      case "reorder_children":
        checkUuid(op.parentId);
        for (const id of op.orderedChildIds) checkUuid(id);
        break;
      default: {
        const _exhaustive: never = op;
        return _exhaustive;
      }
    }
  }

  if (invalidIds.length > 0) {
    const unique = Array.from(new Set(invalidIds)).slice(0, 10);
    const suffix = invalidIds.length > unique.length ? ", ..." : "";
    return { ok: false, message: `Non-UUID ids in operations: ${unique.join(", ")}${suffix}` };
  }

  return { ok: true, operations: nextOperations };
}
