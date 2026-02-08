import { describe, expect, test } from "vitest";

import type { MindmapState, Operation } from "../mindmap/ops";
import { normalizeAiMindmapOperationIds } from "./mindmapOps";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

describe("normalizeAiMindmapOperationIds", () => {
  test("replaces non-UUID add_node ids and rewrites references", () => {
    const rootId = "26168750-5a67-44a3-9efa-cb1af52f7d51";
    const state: MindmapState = {
      rootNodeId: rootId,
      nodesById: {
        [rootId]: {
          id: rootId,
          parentId: null,
          text: "Root",
          notes: null,
          orderIndex: 0,
        },
      },
    };

    const operations: Operation[] = [
      { type: "add_node", nodeId: "tmp-a", parentId: rootId, text: "A" },
      { type: "add_node", nodeId: "tmp-b", parentId: "tmp-a", text: "B" },
      { type: "rename_node", nodeId: "tmp-b", text: "B (renamed)" },
    ];

    const normalized = normalizeAiMindmapOperationIds({ state, operations });
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;

    const addA = normalized.operations[0] as Extract<Operation, { type: "add_node" }>;
    const addB = normalized.operations[1] as Extract<Operation, { type: "add_node" }>;
    const renameB = normalized.operations[2] as Extract<Operation, { type: "rename_node" }>;

    expect(isUuid(addA.nodeId)).toBe(true);
    expect(addA.parentId).toBe(rootId);

    expect(isUuid(addB.nodeId)).toBe(true);
    expect(addB.parentId).toBe(addA.nodeId);

    expect(renameB.nodeId).toBe(addB.nodeId);
  });

  test("keeps UUID add_node ids stable", () => {
    const rootId = "26168750-5a67-44a3-9efa-cb1af52f7d51";
    const nodeId = "7ad52f7a-d0a5-4a7a-9196-20751af97c17";
    const state: MindmapState = {
      rootNodeId: rootId,
      nodesById: {
        [rootId]: {
          id: rootId,
          parentId: null,
          text: "Root",
          notes: null,
          orderIndex: 0,
        },
      },
    };

    const operations: Operation[] = [
      { type: "add_node", nodeId, parentId: rootId, text: "A" },
      { type: "rename_node", nodeId, text: "A (renamed)" },
    ];

    const normalized = normalizeAiMindmapOperationIds({ state, operations });
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;

    expect(normalized.operations[0]).toMatchObject({ type: "add_node", nodeId, parentId: rootId });
    expect(normalized.operations[1]).toMatchObject({ type: "rename_node", nodeId });
  });

  test("rejects duplicate add_node nodeId values", () => {
    const rootId = "26168750-5a67-44a3-9efa-cb1af52f7d51";
    const state: MindmapState = {
      rootNodeId: rootId,
      nodesById: {
        [rootId]: {
          id: rootId,
          parentId: null,
          text: "Root",
          notes: null,
          orderIndex: 0,
        },
      },
    };

    const operations: Operation[] = [
      { type: "add_node", nodeId: "tmp-a", parentId: rootId, text: "A" },
      { type: "add_node", nodeId: "tmp-a", parentId: rootId, text: "A2" },
    ];

    const normalized = normalizeAiMindmapOperationIds({ state, operations });
    expect(normalized.ok).toBe(false);
    if (normalized.ok) return;
    expect(normalized.message).toMatch(/duplicate/i);
  });

  test("rejects add_node nodeId that already exists in state", () => {
    const rootId = "26168750-5a67-44a3-9efa-cb1af52f7d51";
    const state: MindmapState = {
      rootNodeId: rootId,
      nodesById: {
        [rootId]: {
          id: rootId,
          parentId: null,
          text: "Root",
          notes: null,
          orderIndex: 0,
        },
      },
    };

    const operations: Operation[] = [
      { type: "add_node", nodeId: rootId, parentId: rootId, text: "Oops" },
    ];

    const normalized = normalizeAiMindmapOperationIds({ state, operations });
    expect(normalized.ok).toBe(false);
    if (normalized.ok) return;
    expect(normalized.message).toMatch(/must be new/i);
  });

  test("rewrites ids for other operation types", () => {
    const rootId = "26168750-5a67-44a3-9efa-cb1af52f7d51";
    const state: MindmapState = {
      rootNodeId: rootId,
      nodesById: {
        [rootId]: {
          id: rootId,
          parentId: null,
          text: "Root",
          notes: null,
          orderIndex: 0,
        },
      },
    };

    const operations: Operation[] = [
      { type: "add_node", nodeId: "tmp-a", parentId: rootId, text: "A" },
      { type: "add_node", nodeId: "tmp-b", parentId: "tmp-a", text: "B" },
      { type: "update_notes", nodeId: "tmp-b", notes: "N" },
      { type: "move_node", nodeId: "tmp-b", newParentId: rootId },
      { type: "reorder_children", parentId: rootId, orderedChildIds: ["tmp-a"] },
      { type: "delete_node", nodeId: "tmp-b" },
    ];

    const normalized = normalizeAiMindmapOperationIds({ state, operations });
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;

    const addA = normalized.operations[0] as Extract<Operation, { type: "add_node" }>;
    const addB = normalized.operations[1] as Extract<Operation, { type: "add_node" }>;
    const updateNotes = normalized.operations[2] as Extract<Operation, { type: "update_notes" }>;
    const moveNode = normalized.operations[3] as Extract<Operation, { type: "move_node" }>;
    const reorder = normalized.operations[4] as Extract<Operation, { type: "reorder_children" }>;
    const del = normalized.operations[5] as Extract<Operation, { type: "delete_node" }>;

    expect(isUuid(addA.nodeId)).toBe(true);
    expect(isUuid(addB.nodeId)).toBe(true);
    expect(updateNotes.nodeId).toBe(addB.nodeId);
    expect(moveNode.nodeId).toBe(addB.nodeId);
    expect(reorder.orderedChildIds).toEqual([addA.nodeId]);
    expect(del.nodeId).toBe(addB.nodeId);
  });

  test("rejects operations containing non-UUID ids not introduced by add_node", () => {
    const rootId = "26168750-5a67-44a3-9efa-cb1af52f7d51";
    const state: MindmapState = {
      rootNodeId: rootId,
      nodesById: {
        [rootId]: {
          id: rootId,
          parentId: null,
          text: "Root",
          notes: null,
          orderIndex: 0,
        },
      },
    };

    const operations: Operation[] = [{ type: "rename_node", nodeId: "not-a-uuid", text: "X" }];
    const normalized = normalizeAiMindmapOperationIds({ state, operations });
    expect(normalized.ok).toBe(false);
    if (normalized.ok) return;
    expect(normalized.message).toMatch(/non-uuid/i);
  });
});
