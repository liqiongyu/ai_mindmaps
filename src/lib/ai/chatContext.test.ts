import { describe, expect, test } from "vitest";

import { buildAiChatMindmapContext } from "./chatContext";

import type { MindmapState } from "../mindmap/ops";

function makeStarMindmap(nodeCount: number): MindmapState {
  const nodesById: MindmapState["nodesById"] = {
    root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
  };

  for (let i = 1; i < nodeCount; i += 1) {
    nodesById[`n${i}`] = {
      id: `n${i}`,
      parentId: "root",
      text: `Node ${i}`,
      notes: null,
      orderIndex: i - 1,
    };
  }

  return { rootNodeId: "root", nodesById };
}

describe("ai/chatContext", () => {
  test("global context is slimmer than full pretty JSON", () => {
    const state = makeStarMindmap(300);

    const slim = buildAiChatMindmapContext({
      state,
      scope: "global",
      largeMindmapThreshold: 300,
    });

    const pretty = JSON.stringify(
      {
        rootNodeId: state.rootNodeId,
        nodes: Object.values(state.nodesById),
      },
      null,
      2,
    );

    expect(slim).toContain("Mindmap outline");
    expect(slim).toContain("- (root) Root");
    expect(slim.length).toBeLessThan(pretty.length / 2);
  });

  test("node scope context includes path/siblings/subtree, excludes other subtrees", () => {
    const state: MindmapState = {
      rootNodeId: "root",
      nodesById: {
        root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        a: { id: "a", parentId: "root", text: "A", notes: "hello notes", orderIndex: 0 },
        b: { id: "b", parentId: "root", text: "B", notes: null, orderIndex: 1 },
        a1: { id: "a1", parentId: "a", text: "A1", notes: null, orderIndex: 0 },
        a2: { id: "a2", parentId: "a", text: "A2", notes: null, orderIndex: 1 },
        b1: { id: "b1", parentId: "b", text: "B1", notes: null, orderIndex: 0 },
      },
    };

    const ctx = buildAiChatMindmapContext({
      state,
      scope: "node",
      selectedNodeId: "a",
      largeMindmapThreshold: 300,
    });

    expect(ctx).toContain("Selected node: (a) A");
    expect(ctx).toContain("Path (root -> selected):");
    expect(ctx).toContain("- (root) Root");
    expect(ctx).toContain("- (a) A");
    expect(ctx).toContain("Siblings (same parent):");
    expect(ctx).toContain("- (b) B");
    expect(ctx).toContain("Selected subtree outline");
    expect(ctx).toContain("- (a1) A1");
    expect(ctx).toContain("- (a2) A2");
    expect(ctx).toContain("Selected node notes");
    expect(ctx).toContain("hello notes");
    expect(ctx).not.toContain("- (b1) B1");
  });
});
