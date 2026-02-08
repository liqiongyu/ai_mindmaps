import { describe, expect, test } from "vitest";

import { sampleMindmapState } from "./sample";
import { validateOperationsScope } from "./scope";

describe("validateOperationsScope", () => {
  test("allows global scope", () => {
    const workId =
      Object.values(sampleMindmapState.nodesById).find((n) => n.text === "工作")?.id ??
      sampleMindmapState.rootNodeId;
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "global",
      operations: [{ type: "rename_node", nodeId: workId, text: "X" }],
    });
    expect(result.ok).toBe(true);
  });

  test("rejects node-scope ops outside subtree", () => {
    const studyId =
      Object.values(sampleMindmapState.nodesById).find((n) => n.text === "学习")?.id ??
      sampleMindmapState.rootNodeId;
    const workId =
      Object.values(sampleMindmapState.nodesById).find((n) => n.text === "工作")?.id ??
      sampleMindmapState.rootNodeId;
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      selectedNodeId: studyId,
      operations: [{ type: "rename_node", nodeId: workId, text: "X" }],
    });
    expect(result.ok).toBe(false);
  });

  test("allows adding under subtree and then renaming newly-added node", () => {
    const studyId =
      Object.values(sampleMindmapState.nodesById).find((n) => n.text === "学习")?.id ??
      sampleMindmapState.rootNodeId;
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
});
