import { beforeEach, describe, expect, test, vi } from "vitest";

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

describe("/api/mindmaps/[mindmapId]/positions route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("returns 401 when unauthorized", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: null });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/mindmaps/m1/positions", { method: "POST" }) as never,
      {
        params: Promise.resolve({ mindmapId: "m1" }),
      },
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, message: "Unauthorized" });
  });

  test("returns 400 when JSON is invalid", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: "u1" });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/mindmaps/m1/positions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }) as never,
      { params: Promise.resolve({ mindmapId: "m1" }) },
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, message: "Invalid JSON body" });
  });

  test("updates positions via RPC when available", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setRpcHandler("mma_update_mindmap_node_positions", async () => ({
      data: null,
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/mindmaps/m1/positions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ positions: [{ nodeId: "n1", x: 1, y: 2 }] }),
      }) as never,
      { params: Promise.resolve({ mindmapId: "m1" }) },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  test("falls back to row updates when RPC is missing", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setRpcHandler("mma_update_mindmap_node_positions", async () => ({
      data: null,
      error: { code: "PGRST202", message: "could not find the function" },
    }));
    supabase.__setQueryHandler("mindmap_nodes.update", async () => ({ data: null, error: null }));
    supabase.__setQueryHandler("mindmaps.update", async () => ({ data: null, error: null }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/mindmaps/m1/positions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          positions: [
            { nodeId: "n1", x: 1, y: 2 },
            { nodeId: "n2", x: 3, y: 4 },
          ],
        }),
      }) as never,
      { params: Promise.resolve({ mindmapId: "m1" }) },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(
      supabase.__calls.queries.filter(
        (q) => q.table === "mindmap_nodes" && q.operation === "update",
      ).length,
    ).toBe(2);
  });
});
