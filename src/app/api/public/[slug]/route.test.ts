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

describe("/api/public/[slug] route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("returns 500 when RPC fails", async () => {
    const supabase = createSupabaseMock();
    supabase.__setRpcHandler("mma_get_public_mindmap_snapshot", async () => ({
      data: null,
      error: { message: "rpc failed" },
    }));
    mocks.state.supabase = supabase;

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/public/s1") as never, {
      params: Promise.resolve({ slug: "s1" }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, message: "Failed to load public mindmap" });
  });

  test("returns 404 when snapshot is missing", async () => {
    const supabase = createSupabaseMock();
    supabase.__setRpcHandler("mma_get_public_mindmap_snapshot", async () => ({
      data: [],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/public/s1") as never, {
      params: Promise.resolve({ slug: "s1" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, message: "Mindmap not found" });
  });

  test("returns public mindmap snapshot", async () => {
    const supabase = createSupabaseMock();
    supabase.__setRpcHandler("mma_get_public_mindmap_snapshot", async () => ({
      data: [
        {
          title: "T",
          root_node_id: sampleMindmapState.rootNodeId,
          updated_at: "2026-02-08T00:00:00.000Z",
          nodes: Object.values(sampleMindmapState.nodesById).map((n) => ({
            id: n.id,
            parent_id: n.parentId,
            text: n.text,
            notes: n.notes,
            order_index: n.orderIndex,
          })),
        },
      ],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/public/s1") as never, {
      params: Promise.resolve({ slug: "s1" }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as unknown;
    expect(json).toMatchObject({
      ok: true,
      mindmap: { title: "T", rootNodeId: sampleMindmapState.rootNodeId },
    });
  });
});
