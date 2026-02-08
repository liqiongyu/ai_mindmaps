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

describe("/api/mindmaps/[mindmapId]/save route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("returns 401 when unauthorized", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: null });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/mindmaps/m1/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: sampleMindmapState }),
      }) as never,
      { params: Promise.resolve({ mindmapId: "m1" }) },
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
  });

  test("returns 400 when rootNodeId mismatches", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1", title: "T", root_node_id: "00000000-0000-4000-8000-000000000099" },
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/mindmaps/m1/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: sampleMindmapState }),
      }) as never,
      { params: Promise.resolve({ mindmapId: "m1" }) },
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, code: "ROOT_NODE_MISMATCH" });
  });

  test("returns 503 when atomic save RPC is missing", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: {
        id: "m1",
        title: "T",
        root_node_id: sampleMindmapState.rootNodeId,
      },
      error: null,
    }));
    supabase.__setRpcHandler("mma_replace_mindmap_nodes", async () => ({
      data: null,
      error: { code: "PGRST202", message: "could not find the function" },
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/mindmaps/m1/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: sampleMindmapState }),
      }) as never,
      { params: Promise.resolve({ mindmapId: "m1" }) },
    );

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, code: "PERSISTENCE_UNAVAILABLE" });
  });

  test("returns ok:true when saved", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: {
        id: "m1",
        title: "T",
        root_node_id: sampleMindmapState.rootNodeId,
      },
      error: null,
    }));
    supabase.__setRpcHandler("mma_replace_mindmap_nodes", async () => ({
      data: null,
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/mindmaps/m1/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: sampleMindmapState }),
      }) as never,
      { params: Promise.resolve({ mindmapId: "m1" }) },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
