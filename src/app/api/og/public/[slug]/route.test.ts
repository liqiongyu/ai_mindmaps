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

describe("/api/og/public/[slug] route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("returns image/png response when snapshot exists", async () => {
    const supabase = createSupabaseMock();
    supabase.__setRpcHandler("mma_get_public_mindmap_snapshot", async () => ({
      data: [
        {
          title: "T",
          updated_at: "2026-02-08T00:00:00.000Z",
          nodes: [],
        },
      ],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/og/public/s1") as never, {
      params: Promise.resolve({ slug: "s1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/image\/png/);
  });
});
