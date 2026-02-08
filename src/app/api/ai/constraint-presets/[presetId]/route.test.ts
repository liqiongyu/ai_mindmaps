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

const sampleConstraints = {
  outputLanguage: "zh",
  branchCount: 4,
  depth: 2,
  allowMove: true,
  allowDelete: false,
} as const;

describe("/api/ai/constraint-presets/[presetId] route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("PATCH returns 401 when unauthorized", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: null });
    const { PATCH } = await import("./route");

    const res = await PATCH(new Request("http://localhost/api/ai/constraint-presets/p1") as never, {
      params: Promise.resolve({ presetId: "p1" }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, message: "Unauthorized" });
  });

  test("PATCH returns 400 when body is empty", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: "u1" });
    const { PATCH } = await import("./route");

    const res = await PATCH(
      new Request("http://localhost/api/ai/constraint-presets/p1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ presetId: "p1" }) },
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, message: "Invalid request body" });
  });

  test("PATCH returns 404 when preset not found", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("ai_constraint_presets.update", async () => ({
      data: null,
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { PATCH } = await import("./route");
    const res = await PATCH(
      new Request("http://localhost/api/ai/constraint-presets/p1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "New" }),
      }),
      { params: Promise.resolve({ presetId: "p1" }) },
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, message: "Preset not found" });
  });

  test("PATCH updates preset", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("ai_constraint_presets.update", async () => ({
      data: {
        id: "p1",
        name: "New",
        config: sampleConstraints,
        updated_at: "2026-02-08T00:00:00.000Z",
      },
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { PATCH } = await import("./route");
    const res = await PATCH(
      new Request("http://localhost/api/ai/constraint-presets/p1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "New" }),
      }),
      { params: Promise.resolve({ presetId: "p1" }) },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      preset: {
        id: "p1",
        name: "New",
        constraints: sampleConstraints,
        updatedAt: "2026-02-08T00:00:00.000Z",
      },
    });
  });

  test("DELETE returns 404 when preset not found", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("ai_constraint_presets.delete", async () => ({
      data: null,
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { DELETE } = await import("./route");
    const res = await DELETE(
      new Request("http://localhost/api/ai/constraint-presets/p1") as never,
      {
        params: Promise.resolve({ presetId: "p1" }),
      },
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, message: "Preset not found" });
  });

  test("DELETE deletes preset", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("ai_constraint_presets.delete", async () => ({
      data: { id: "p1" },
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { DELETE } = await import("./route");
    const res = await DELETE(
      new Request("http://localhost/api/ai/constraint-presets/p1") as never,
      {
        params: Promise.resolve({ presetId: "p1" }),
      },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
