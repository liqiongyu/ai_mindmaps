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

describe("/api/usage route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("returns 401 when unauthorized", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: null });
    const { GET } = await import("./route");

    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
  });

  test("returns usage metrics and limits", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });

    supabase.__setQueryHandler("usage_counters.select", async (ctx) => {
      const metric = ctx.filters.find((f) => f.type === "eq" && f.column === "metric");
      if (metric && "value" in metric && metric.value === "ai_chat") {
        return { data: { used: 72 }, error: null };
      }
      if (metric && "value" in metric && metric.value === "audit_export") {
        return { data: { used: 15 }, error: null };
      }
      return { data: null, error: null };
    });

    supabase.__setQueryHandler("plan_limits.select", async (ctx) => {
      const metric = ctx.filters.find((f) => f.type === "eq" && f.column === "metric");
      const period = ctx.filters.find((f) => f.type === "eq" && f.column === "period");
      if (metric && period && "value" in metric && "value" in period) {
        if (metric.value === "ai_chat" && period.value === "day") {
          return { data: { limit: 100, is_enabled: true }, error: null };
        }
        if (metric.value === "audit_export" && period.value === "day") {
          return { data: { limit: 50, is_enabled: true }, error: null };
        }
        if (metric.value === "public_shares" && period.value === "active") {
          return { data: { limit: 10, is_enabled: true }, error: null };
        }
      }
      return { data: null, error: null };
    });

    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: [{ id: "m1" }],
      error: null,
      count: 3,
    }));

    mocks.state.supabase = supabase;

    const { GET } = await import("./route");
    const res = await GET();

    expect(res.status).toBe(200);
    const json = (await res.json()) as unknown;
    expect(json).toMatchObject({
      ok: true,
      planKey: "free",
      metrics: {
        ai_chat: { used: 72, limit: 100 },
        audit_export: { used: 15, limit: 50 },
        public_shares: { used: 3, limit: 10 },
      },
      upgradeUrl: "/pricing",
    });
  });
});
