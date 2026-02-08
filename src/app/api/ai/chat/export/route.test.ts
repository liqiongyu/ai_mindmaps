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

function mockCheckQuota(
  supabase: SupabaseMock,
  overrides?: { ok?: boolean; used?: number; limit?: number | null },
) {
  const ok = overrides?.ok ?? true;
  const used = overrides?.used ?? 0;
  const limit = overrides?.limit ?? 50;
  supabase.__setRpcHandler("mma_check_quota", async () => ({
    data: [
      {
        ok,
        metric: "audit_export",
        plan: "free",
        period: "day",
        period_start: "2026-02-08",
        used,
        limit,
        reset_at: "2026-02-09T00:00:00.000Z",
      },
    ],
    error: null,
  }));
}

function mockConsumeQuota(
  supabase: SupabaseMock,
  overrides?: { ok?: boolean; used?: number; limit?: number | null },
) {
  const ok = overrides?.ok ?? true;
  const used = overrides?.used ?? 1;
  const limit = overrides?.limit ?? 50;
  supabase.__setRpcHandler("mma_consume_quota", async () => ({
    data: [
      {
        ok,
        metric: "audit_export",
        plan: "free",
        period: "day",
        period_start: "2026-02-08",
        used,
        limit,
        reset_at: "2026-02-09T00:00:00.000Z",
      },
    ],
    error: null,
  }));
}

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
    mockCheckQuota(supabase);
    mockConsumeQuota(supabase);
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
    expect(supabase.__calls.rpcs.map((c) => c.fn)).toEqual(["mma_check_quota"]);
  });

  test("returns 404 when mindmap is not owned", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: null,
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/ai/chat/export?mindmapId=m1&scope=global"),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ ok: false, code: "MINDMAP_NOT_FOUND" });
    expect(supabase.__calls.rpcs).toHaveLength(0);
  });

  test("exports audit payload as an attachment", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    mockCheckQuota(supabase);
    mockConsumeQuota(supabase);
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
    expect(supabase.__calls.rpcs.map((c) => c.fn)).toEqual([
      "mma_check_quota",
      "mma_consume_quota",
    ]);
  });

  test("export payload includes provider/model and operations for assistant messages", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    mockCheckQuota(supabase);
    mockConsumeQuota(supabase);
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
          role: "assistant",
          content: "done",
          operations: [{ type: "rename_node", nodeId: "n1", text: "New title" }],
          provider: "openai",
          model: "gpt-4o-mini",
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
    const json = (await res.json()) as unknown;
    expect(json).toMatchObject({
      ok: true,
      version: "v1",
      mindmapId: "m1",
      messages: [
        {
          role: "assistant",
          provider: "openai",
          model: "gpt-4o-mini",
          operations: [{ type: "rename_node", nodeId: "n1", text: "New title" }],
          createdAt: "2026-02-08T00:00:01.000Z",
        },
      ],
    });
    expect(supabase.__calls.rpcs.map((c) => c.fn)).toEqual([
      "mma_check_quota",
      "mma_consume_quota",
    ]);
  });

  test("returns 429 when over quota", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    mockCheckQuota(supabase, { ok: false, used: 50, limit: 50 });
    mockConsumeQuota(supabase);
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

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({
      ok: false,
      code: "quota_exceeded",
      upgradeUrl: "/pricing",
    });
    expect(supabase.__calls.rpcs.map((c) => c.fn)).toEqual(["mma_check_quota"]);
    expect(supabase.__calls.queries.some((q) => q.table === "chat_threads")).toBe(false);
  });
});
