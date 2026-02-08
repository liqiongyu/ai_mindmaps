import { describe, expect, test } from "vitest";

import { sampleMindmapState } from "./sample";
import { TRY_DRAFT_STORAGE_KEY, parseTryDraftJson, stringifyTryDraft } from "./tryDraft";

describe("tryDraft", () => {
  test("uses the v1 localStorage key", () => {
    expect(TRY_DRAFT_STORAGE_KEY).toBe("mma:try:draft:v1");
  });

  test("round-trips a valid draft payload", () => {
    const draft = {
      state: sampleMindmapState,
      updatedAt: new Date().toISOString(),
      ui: {
        collapsedNodeIds: [sampleMindmapState.rootNodeId],
        selectedNodeId: null,
        viewport: null,
      },
    };

    const json = stringifyTryDraft(draft);
    const parsed = parseTryDraftJson(json);

    expect(parsed).not.toBeNull();
    expect(parsed?.state.rootNodeId).toBe(sampleMindmapState.rootNodeId);
    expect(parsed?.ui.collapsedNodeIds).toEqual([sampleMindmapState.rootNodeId]);
    expect(parsed?.ui.viewport).toBeNull();
  });

  test("accepts a legacy payload without viewport", () => {
    const draft = {
      state: sampleMindmapState,
      updatedAt: new Date().toISOString(),
      ui: { collapsedNodeIds: [sampleMindmapState.rootNodeId], selectedNodeId: null },
    };

    const json = JSON.stringify(draft);
    const parsed = parseTryDraftJson(json);

    expect(parsed).not.toBeNull();
    expect(parsed?.ui.viewport).toBeNull();
  });

  test("accepts a payload with viewport", () => {
    const draft = {
      state: sampleMindmapState,
      updatedAt: new Date().toISOString(),
      ui: {
        collapsedNodeIds: [],
        selectedNodeId: sampleMindmapState.rootNodeId,
        viewport: { x: 1, y: 2, zoom: 0.9 },
      },
    };

    const json = stringifyTryDraft(draft);
    const parsed = parseTryDraftJson(json);

    expect(parsed).not.toBeNull();
    expect(parsed?.ui.viewport).toEqual({ x: 1, y: 2, zoom: 0.9 });
  });

  test("migrates legacy (non-UUID) draft state ids to UUIDs", () => {
    const legacyDraft = {
      state: {
        rootNodeId: "root",
        nodesById: {
          root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
          child: { id: "child", parentId: "root", text: "Child", notes: null, orderIndex: 0 },
        },
      },
      updatedAt: new Date().toISOString(),
      ui: {
        collapsedNodeIds: ["child"],
        selectedNodeId: "child",
        viewport: null,
      },
    };

    const parsed = parseTryDraftJson(JSON.stringify(legacyDraft));
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    expect(parsed.state.rootNodeId).not.toBe("root");
    expect(Object.keys(parsed.state.nodesById).length).toBe(2);

    const root = parsed.state.nodesById[parsed.state.rootNodeId];
    expect(root).toBeTruthy();
    expect(root.parentId).toBeNull();

    const child = Object.values(parsed.state.nodesById).find((n) => n.text === "Child");
    expect(child).toBeTruthy();
    expect(child?.parentId).toBe(parsed.state.rootNodeId);
    expect(parsed.ui.selectedNodeId).toBe(child?.id);
  });

  test("returns null for invalid JSON", () => {
    expect(parseTryDraftJson("{not-json")).toBeNull();
  });

  test("returns null for invalid shape", () => {
    const json = JSON.stringify({ ok: true });
    expect(parseTryDraftJson(json)).toBeNull();
  });

  test("returns null for legacy payload when root node is missing", () => {
    const legacyDraft = {
      state: {
        rootNodeId: "missing",
        nodesById: {
          root: { id: "root", parentId: null, text: "Root", notes: null, orderIndex: 0 },
        },
      },
      updatedAt: new Date().toISOString(),
      ui: {
        collapsedNodeIds: [],
        selectedNodeId: null,
        viewport: null,
      },
    };

    expect(parseTryDraftJson(JSON.stringify(legacyDraft))).toBeNull();
  });

  test("returns null for legacy payload when root parentId is not null", () => {
    const legacyDraft = {
      state: {
        rootNodeId: "root",
        nodesById: {
          root: { id: "root", parentId: "x", text: "Root", notes: null, orderIndex: 0 },
        },
      },
      updatedAt: new Date().toISOString(),
      ui: {
        collapsedNodeIds: [],
        selectedNodeId: null,
        viewport: null,
      },
    };

    expect(parseTryDraftJson(JSON.stringify(legacyDraft))).toBeNull();
  });
});
