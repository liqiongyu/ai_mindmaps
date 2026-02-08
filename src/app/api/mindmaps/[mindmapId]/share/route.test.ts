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

describe("/api/mindmaps/[mindmapId]/share route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("POST returns 401 when unauthorized", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: null });
    const { POST } = await import("./route");

    const res = await POST(new Request("http://localhost/api/mindmaps/m1/share") as never, {
      params: Promise.resolve({ mindmapId: "m1" }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, message: "Unauthorized" });
  });

  test("POST retries on slug collision and returns publicSlug", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    let attempts = 0;
    supabase.__setQueryHandler("plan_limits.select", async () => ({
      data: { limit: 10, is_enabled: true },
      error: null,
    }));
    supabase.__setQueryHandler("mindmaps.select", async (ctx) => {
      const hasIdFilter = ctx.filters.some((f) => f.type === "eq" && f.column === "id");
      if (hasIdFilter) {
        return { data: { id: "m1", is_public: false }, error: null };
      }
      return { data: [{ id: "m2" }], error: null, count: 3 };
    });
    supabase.__setQueryHandler("mindmaps.update", async () => {
      attempts += 1;
      if (attempts === 1) {
        return { data: null, error: { code: "23505", message: "duplicate key value" } };
      }
      return { data: { public_slug: "slug_ok" }, error: null };
    });
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/mindmaps/m1/share") as never, {
      params: Promise.resolve({ mindmapId: "m1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, publicSlug: "slug_ok" });
    expect(attempts).toBe(2);
  });

  test("POST fails after 3 collisions", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("plan_limits.select", async () => ({
      data: { limit: 10, is_enabled: true },
      error: null,
    }));
    supabase.__setQueryHandler("mindmaps.select", async (ctx) => {
      const hasIdFilter = ctx.filters.some((f) => f.type === "eq" && f.column === "id");
      if (hasIdFilter) {
        return { data: { id: "m1", is_public: false }, error: null };
      }
      return { data: [{ id: "m2" }], error: null, count: 3 };
    });
    supabase.__setQueryHandler("mindmaps.update", async () => ({
      data: null,
      error: { code: "23505", message: "duplicate key value" },
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/mindmaps/m1/share") as never, {
      params: Promise.resolve({ mindmapId: "m1" }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      ok: false,
      message: "Failed to generate a unique public slug",
    });
  });

  test("POST returns 429 when active share limit is reached", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("plan_limits.select", async () => ({
      data: { limit: 1, is_enabled: true },
      error: null,
    }));
    supabase.__setQueryHandler("mindmaps.select", async (ctx) => {
      const hasIdFilter = ctx.filters.some((f) => f.type === "eq" && f.column === "id");
      if (hasIdFilter) {
        return { data: { id: "m1", is_public: false }, error: null };
      }
      return { data: [{ id: "m2" }], error: null, count: 1 };
    });
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/mindmaps/m1/share") as never, {
      params: Promise.resolve({ mindmapId: "m1" }),
    });

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({
      ok: false,
      code: "quota_exceeded",
      upgradeUrl: "/pricing",
    });
  });

  test("DELETE returns ok:true when share is stopped", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.update", async () => ({
      data: { id: "m1" },
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { DELETE } = await import("./route");
    const res = await DELETE(new Request("http://localhost/api/mindmaps/m1/share") as never, {
      params: Promise.resolve({ mindmapId: "m1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
