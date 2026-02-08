import { beforeEach, describe, expect, test, vi } from "vitest";

import { sampleMindmapState } from "@/lib/mindmap/sample";
import { createSupabaseMock, type SupabaseMock } from "@/testUtils/supabaseMock";

const mocks = vi.hoisted(() => {
  const state = { supabase: null as unknown as SupabaseMock };
  return {
    state,
    createSupabaseServerClient: vi.fn(async () => state.supabase),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

describe("/api/mindmaps/import-try route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("returns 401 when unauthorized", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: null });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/mindmaps/import-try", { method: "POST" }) as never,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, message: "Unauthorized" });
  });

  test("imports try draft and returns mindmapId", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.insert", async () => ({ data: null, error: null }));
    supabase.__setRpcHandler("mma_replace_mindmap_nodes", async () => ({
      data: null,
      error: null,
    }));
    supabase.__setQueryHandler("mindmap_ui_state.upsert", async () => ({
      data: null,
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/mindmaps/import-try", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "try",
          draft: sampleMindmapState,
          ui: {
            collapsedNodeIds: [],
            selectedNodeId: sampleMindmapState.rootNodeId,
            viewport: null,
          },
        }),
      }) as never,
    );

    expect(res.status).toBe(201);
    const json = (await res.json()) as unknown;
    expect(json).toMatchObject({ ok: true });
  });
});
