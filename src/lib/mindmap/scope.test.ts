import { describe, expect, test } from "vitest";

import { sampleMindmapState } from "./sample";
import { validateOperationsScope } from "./scope";

describe("validateOperationsScope", () => {
  const studyId =
    Object.values(sampleMindmapState.nodesById).find((n) => n.text === "学习")?.id ??
    sampleMindmapState.rootNodeId;
  const workId =
    Object.values(sampleMindmapState.nodesById).find((n) => n.text === "工作")?.id ??
    sampleMindmapState.rootNodeId;

  test("allows global scope", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "global",
      operations: [{ type: "rename_node", nodeId: workId, text: "X" }],
    });
    expect(result.ok).toBe(true);
  });

  test("rejects node-scope ops outside subtree", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      selectedNodeId: studyId,
      operations: [{ type: "rename_node", nodeId: workId, text: "X" }],
    });
    expect(result.ok).toBe(false);
  });

  test("allows adding under subtree and then renaming newly-added node", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      selectedNodeId: studyId,
      operations: [
        { type: "add_node", nodeId: "new1", parentId: studyId, text: "New" },
        { type: "rename_node", nodeId: "new1", text: "Renamed" },
      ],
    });
    expect(result.ok).toBe(true);
  });

  test("rejects node scope when selectedNodeId is missing", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      operations: [{ type: "rename_node", nodeId: studyId, text: "X" }],
    });
    expect(result.ok).toBe(false);
  });

  test("rejects node scope when selectedNodeId is invalid", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      selectedNodeId: "missing-node",
      operations: [{ type: "rename_node", nodeId: studyId, text: "X" }],
    });
    expect(result.ok).toBe(false);
  });

  test("supports update_notes inside subtree", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      selectedNodeId: studyId,
      operations: [{ type: "update_notes", nodeId: studyId, notes: "note" }],
    });
    expect(result.ok).toBe(true);
  });

  test("rejects move_node when newParentId is outside subtree", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      selectedNodeId: studyId,
      operations: [{ type: "move_node", nodeId: studyId, newParentId: workId }],
    });
    expect(result.ok).toBe(false);
  });

  test("rejects delete_node outside subtree", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      selectedNodeId: studyId,
      operations: [{ type: "delete_node", nodeId: workId }],
    });
    expect(result.ok).toBe(false);
  });

  test("rejects reorder_children when child ids include outside subtree", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      selectedNodeId: studyId,
      operations: [{ type: "reorder_children", parentId: studyId, orderedChildIds: [workId] }],
    });
    expect(result.ok).toBe(false);
  });

  test("returns error for unknown operation type", () => {
    const badOp = { type: "nope" } as unknown as import("./ops").Operation;
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      selectedNodeId: studyId,
      operations: [badOp],
    });
    expect(result.ok).toBe(false);
  });
});
