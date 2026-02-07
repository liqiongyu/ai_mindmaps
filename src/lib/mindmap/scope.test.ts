import { describe, expect, test } from "vitest";

import { sampleMindmapState } from "./sample";
import { validateOperationsScope } from "./scope";

describe("validateOperationsScope", () => {
  test("allows global scope", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "global",
      operations: [{ type: "rename_node", nodeId: "b", text: "X" }],
    });
    expect(result.ok).toBe(true);
  });

  test("rejects node-scope ops outside subtree", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      selectedNodeId: "a",
      operations: [{ type: "rename_node", nodeId: "b", text: "X" }],
    });
    expect(result.ok).toBe(false);
  });

  test("allows adding under subtree and then renaming newly-added node", () => {
    const result = validateOperationsScope({
      state: sampleMindmapState,
      scope: "node",
      selectedNodeId: "a",
      operations: [
        { type: "add_node", nodeId: "new1", parentId: "a", text: "New" },
        { type: "rename_node", nodeId: "new1", text: "Renamed" },
      ],
    });
    expect(result.ok).toBe(true);
  });
});
