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

describe("/api/ai/chat/export route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("returns 401 when unauthorized", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: null });
    const { GET } = await import("./route");

    const res = await GET(
      new Request("http://localhost/api/ai/chat/export?mindmapId=m1&scope=global"),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
  });

  test("returns 400 on invalid query", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: "u1" });
    const { GET } = await import("./route");

    const res = await GET(
      new Request("http://localhost/api/ai/chat/export?mindmapId=&scope=global"),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, code: "INVALID_QUERY" });
  });

  test("returns 501 when chat persistence schema is missing", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1" },
      error: null,
    }));
    supabase.__setQueryHandler("chat_threads.select", async () => ({
      data: null,
      error: { code: "PGRST205", message: "could not find the table" },
    }));
    mocks.state.supabase = supabase;

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/ai/chat/export?mindmapId=m1&scope=global"),
    );

    expect(res.status).toBe(501);
    expect(await res.json()).toMatchObject({ ok: false, code: "chat_persistence_unavailable" });
  });

  test("exports audit payload as an attachment", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1" },
      error: null,
    }));
    supabase.__setQueryHandler("chat_threads.select", async () => ({
      data: { id: "t1", scope: "global", node_id: null, created_at: "2026-02-08T00:00:00.000Z" },
      error: null,
    }));
    supabase.__setQueryHandler("chat_messages.select", async () => ({
      data: [
        {
          id: "msg1",
          role: "user",
          content: "hi",
          operations: null,
          provider: null,
          model: null,
          created_at: "2026-02-08T00:00:01.000Z",
        },
      ],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/ai/chat/export?mindmapId=m1&scope=global"),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename=/);
    const json = (await res.json()) as unknown;
    expect(json).toMatchObject({
      ok: true,
      version: "v1",
      mindmapId: "m1",
      thread: { id: "t1", scope: "global", nodeId: null },
    });
  });
});
