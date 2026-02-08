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

describe("/api/mindmaps/[mindmapId]/ui route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("returns 401 when unauthorized", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: null });
    const { POST } = await import("./route");

    const res = await POST(new Request("http://localhost/api/mindmaps/m1/ui") as never, {
      params: Promise.resolve({ mindmapId: "m1" }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, message: "Unauthorized" });
  });

  test("returns 400 on invalid request body", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: "u1" });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/mindmaps/m1/ui", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ mindmapId: "m1" }) },
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, message: "Invalid request body" });
  });

  test("returns 404 when mindmap is missing", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.select", async () => ({ data: null, error: null }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/mindmaps/m1/ui", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          collapsedNodeIds: [],
          selectedNodeId: null,
          viewport: null,
        }),
      }),
      { params: Promise.resolve({ mindmapId: "m1" }) },
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, message: "Mindmap not found" });
  });

  test("returns ok:true when schema is missing (best-effort)", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1", root_node_id: sampleMindmapState.rootNodeId },
      error: null,
    }));
    supabase.__setQueryHandler("mindmap_ui_state.upsert", async () => ({
      data: null,
      error: { code: "PGRST205", message: "could not find the table" },
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/mindmaps/m1/ui", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          collapsedNodeIds: [],
          selectedNodeId: sampleMindmapState.rootNodeId,
          viewport: { x: 0, y: 0, zoom: 1 },
        }),
      }),
      { params: Promise.resolve({ mindmapId: "m1" }) },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
