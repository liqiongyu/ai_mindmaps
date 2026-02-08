import { beforeEach, describe, expect, test, vi } from "vitest";

import { createSupabaseMock, type SupabaseMock } from "@/testUtils/supabaseMock";

const mocks = vi.hoisted(() => {
  const state = {
    supabase: null as unknown as SupabaseMock,
  };
  return {
    state,
    createSupabaseServerClient: vi.fn(async () => state.supabase),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

describe("/api/templates route", () => {
  beforeEach(() => {
    mocks.createSupabaseServerClient.mockClear();
  });

  test("returns 401 when unauthorized", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: null });
    const { GET } = await import("./route");

    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, message: "Unauthorized" });
  });

  test("returns templates list for authenticated user", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmap_templates.select", async () => ({
      data: [
        {
          id: "t1",
          slug: "study-plan",
          title: "学习计划",
          description: "desc",
          category: "学习",
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
      items: [
        {
          id: "t1",
          slug: "study-plan",
          title: "学习计划",
          description: "desc",
          category: "学习",
        },
      ],
    });

    expect(supabase.__calls.queries.map((q) => `${q.table}.${q.operation}`)).toEqual([
      "mindmap_templates.select",
    ]);
  });

  test("returns 503 when templates schema is missing", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmap_templates.select", async () => ({
      data: null,
      error: { code: "PGRST205", message: 'could not find the table "mindmap_templates"' },
    }));
    mocks.state.supabase = supabase;

    const { GET } = await import("./route");

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      ok: false,
      message: "Templates schema is missing. Apply Supabase migrations first.",
    });
  });
});
