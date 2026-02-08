import { describe, expect, test } from "vitest";

import { sampleMindmapState } from "./sample";
import { remapMindmapStateIds, remapMindmapUiStateIds } from "./importTryDraft";

describe("importTryDraft", () => {
  test("remaps state ids while preserving structure", () => {
    let counter = 0;
    const generateId = () => `id-${counter++}`;

    const { state, idMap } = remapMindmapStateIds(sampleMindmapState, generateId);

    expect(Object.keys(state.nodesById)).toHaveLength(
      Object.keys(sampleMindmapState.nodesById).length,
    );
    expect(state.rootNodeId).toBe(idMap[sampleMindmapState.rootNodeId]);
    expect(state.nodesById[state.rootNodeId]?.parentId).toBeNull();

    for (const [oldId, oldNode] of Object.entries(sampleMindmapState.nodesById)) {
      const nextId = idMap[oldId];
      const nextNode = state.nodesById[nextId];

      expect(nextNode).toBeDefined();
      expect(nextNode?.id).toBe(nextId);
      expect(nextNode?.text).toBe(oldNode.text);
      expect(nextNode?.notes).toBe(oldNode.notes);
      expect(nextNode?.orderIndex).toBe(oldNode.orderIndex);
      expect(nextNode?.parentId).toBe(oldNode.parentId ? idMap[oldNode.parentId] : null);
    }
  });

  test("remaps ui state ids and filters missing nodes", () => {
    let counter = 0;
    const generateId = () => `id-${counter++}`;
    const { idMap } = remapMindmapStateIds(sampleMindmapState, generateId);
    const selectedNodeId =
      Object.values(sampleMindmapState.nodesById).find((n) => n.text === "目标")?.id ??
      sampleMindmapState.rootNodeId;

    const ui = {
      collapsedNodeIds: [sampleMindmapState.rootNodeId, "missing"],
      selectedNodeId,
      viewport: null,
    };

    const remapped = remapMindmapUiStateIds(ui, idMap);
    expect(remapped.collapsedNodeIds).toEqual([idMap[sampleMindmapState.rootNodeId]]);
    expect(remapped.selectedNodeId).toBe(idMap[selectedNodeId]);

    const missingSelected = remapMindmapUiStateIds({ ...ui, selectedNodeId: "missing" }, idMap);
    expect(missingSelected.selectedNodeId).toBeNull();
  });
});
