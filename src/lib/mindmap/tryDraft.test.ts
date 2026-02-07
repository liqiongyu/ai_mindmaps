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

  test("returns null for invalid JSON", () => {
    expect(parseTryDraftJson("{not-json")).toBeNull();
  });

  test("returns null for invalid shape", () => {
    const json = JSON.stringify({ ok: true });
    expect(parseTryDraftJson(json)).toBeNull();
  });
});
