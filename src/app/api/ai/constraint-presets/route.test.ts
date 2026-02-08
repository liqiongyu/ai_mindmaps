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

describe("/api/ai/constraint-presets route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("GET returns 401 when unauthorized", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: null });
    const { GET } = await import("./route");

    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, message: "Unauthorized" });
  });

  test("GET returns presets list", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("ai_constraint_presets.select", async () => ({
      data: [
        {
          id: "p1",
          name: "Default",
          config: sampleConstraints,
          updated_at: "2026-02-08T00:00:00.000Z",
        },
      ],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { GET } = await import("./route");
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      presets: [
        {
          id: "p1",
          name: "Default",
          constraints: sampleConstraints,
          updatedAt: "2026-02-08T00:00:00.000Z",
        },
      ],
    });
  });

  test("POST returns 400 on invalid request body", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: "u1" });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/ai/constraint-presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, message: "Invalid request body" });
  });

  test("POST returns 409 on duplicate preset name", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("ai_constraint_presets.insert", async () => ({
      data: null,
      error: { code: "23505", message: "duplicate key value" },
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/constraint-presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Default", constraints: sampleConstraints }),
      }),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, message: "Preset name already exists" });
  });

  test("POST creates preset", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("ai_constraint_presets.insert", async () => ({
      data: {
        id: "p1",
        name: "Default",
        config: sampleConstraints,
        updated_at: "2026-02-08T00:00:00.000Z",
      },
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/constraint-presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Default", constraints: sampleConstraints }),
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      ok: true,
      preset: {
        id: "p1",
        name: "Default",
        constraints: sampleConstraints,
        updatedAt: "2026-02-08T00:00:00.000Z",
      },
    });
  });
});
