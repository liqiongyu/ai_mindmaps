import { beforeEach, describe, expect, test, vi } from "vitest";

import { createSupabaseMock, type SupabaseMock } from "@/testUtils/supabaseMock";

const openaiMocks = vi.hoisted(() => {
  const state = {
    response: {
      status: "completed",
      output_text: "",
      incomplete_details: null as null | { reason?: string },
    },
  };

  return {
    state,
    getAzureOpenAIConfigFromEnv: vi.fn(() => ({
      apiKey: "test",
      endpoint: "https://example.invalid",
      apiVersion: "2025-04-01-preview",
      deployment: "gpt-5-mini",
      model: "gpt-5-mini",
    })),
    createAzureOpenAIClient: vi.fn(() => ({
      responses: {
        create: vi.fn(async () => state.response),
      },
    })),
  };
});

vi.mock("@/lib/llm/azureOpenAI", () => ({
  getAzureOpenAIConfigFromEnv: openaiMocks.getAzureOpenAIConfigFromEnv,
  createAzureOpenAIClient: openaiMocks.createAzureOpenAIClient,
}));

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
  const limit = overrides?.limit ?? 100;
  supabase.__setRpcHandler("mma_check_quota", async () => ({
    data: [
      {
        ok,
        metric: "ai_chat",
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
  const limit = overrides?.limit ?? 100;
  supabase.__setRpcHandler("mma_consume_quota", async () => ({
    data: [
      {
        ok,
        metric: "ai_chat",
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

describe("/api/ai/chat route", () => {
  beforeEach(() => {
    vi.resetModules();
    openaiMocks.getAzureOpenAIConfigFromEnv.mockClear();
    openaiMocks.createAzureOpenAIClient.mockClear();
    openaiMocks.state.response = {
      status: "completed",
      output_text: "",
      incomplete_details: null,
    };
  });

  test("GET returns ok:true with empty history when chat persistence schema is missing", async () => {
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
    const res = await GET(new Request("http://localhost/api/ai/chat?mindmapId=m1&scope=global"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, thread: null, messages: [] });
  });

  test("GET returns metadata when available (constraints snapshot)", async () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000001";
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
          role: "assistant",
          content: "done",
          operations: [{ type: "add_node", nodeId: "n1", parentId: rootNodeId, text: "New" }],
          provider: "openai",
          model: "gpt-4o-mini",
          metadata: {
            constraints: {
              outputLanguage: "en",
              branchCount: 4,
              depth: 2,
              allowMove: true,
              allowDelete: false,
            },
          },
          created_at: "2026-02-08T00:00:01.000Z",
        },
      ],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/ai/chat?mindmapId=m1&scope=global"));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      thread: { id: "t1", scope: "global", nodeId: null },
      messages: [
        {
          id: "msg1",
          role: "assistant",
          metadata: {
            constraints: {
              outputLanguage: "en",
              branchCount: 4,
              depth: 2,
              allowMove: true,
              allowDelete: false,
            },
          },
        },
      ],
    });
  });

  test("GET falls back when metadata column is missing (messages still load)", async () => {
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1" },
      error: null,
    }));
    supabase.__setQueryHandler("chat_threads.select", async () => ({
      data: { id: "t1", scope: "global", node_id: null, created_at: "2026-02-08T00:00:00.000Z" },
      error: null,
    }));
    supabase.__setQueryHandler("chat_messages.select", async (ctx) => {
      if (ctx.select && ctx.select.includes("metadata")) {
        return {
          data: null,
          error: { code: "PGRST204", message: "could not find the 'metadata' column" },
        };
      }
      return {
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
      };
    });
    mocks.state.supabase = supabase;

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/ai/chat?mindmapId=m1&scope=global"));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      thread: { id: "t1", scope: "global", nodeId: null },
      messages: [{ id: "msg1", role: "user", content: "hi" }],
    });

    const messageSelects = supabase.__calls.queries.filter(
      (q) => q.table === "chat_messages" && q.operation === "select",
    );
    expect(messageSelects).toHaveLength(2);
    expect(messageSelects[0]?.select).toContain("metadata");
    expect(messageSelects[1]?.select).not.toContain("metadata");
  });

  test("returns 401 UNAUTHORIZED when user is missing", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: null });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
  });

  test("returns 400 INVALID_JSON when JSON parsing fails", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: "u1" });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, code: "INVALID_JSON" });
  });

  test("returns 400 INVALID_BODY when request schema is invalid", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: "u1" });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mindmapId: "", scope: "global", userMessage: "" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, code: "INVALID_BODY" });
  });

  test("rejects providedOutput with dryRun", async () => {
    mocks.state.supabase = createSupabaseMock({ userId: "u1" });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mindmapId: "m1",
          scope: "global",
          userMessage: "hi",
          dryRun: true,
          providedOutput: { assistant_message: "ok", operations: [] },
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
  });

  test("supports providedOutput path without provider calls", async () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000001";
    const supabase = createSupabaseMock({ userId: "u1" });
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1", root_node_id: rootNodeId },
      error: null,
    }));
    supabase.__setQueryHandler("chat_threads.select", async () => ({
      data: null,
      error: { code: "PGRST205", message: "could not find the table" },
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mindmapId: "m1",
          scope: "global",
          userMessage: "Add a node",
          providedOutput: {
            assistant_message: "Done.",
            operations: [
              {
                type: "add_node",
                nodeId: "00000000-0000-4000-8000-000000000010",
                parentId: rootNodeId,
                text: "New",
              },
            ],
          },
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as unknown;
    expect(json).toMatchObject({
      ok: true,
      dryRun: false,
      provider: null,
      model: null,
      persistence: { chatPersisted: false },
    });
  });

  test("POST supports model path with dryRun and returns operations", async () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000001";
    openaiMocks.state.response.output_text = JSON.stringify({
      assistant_message: "OK",
      operations: [
        { type: "add_node", nodeId: "n1", parentId: rootNodeId, text: "New" },
        { type: "rename_node", nodeId: rootNodeId, text: "Root (renamed)" },
      ],
    });

    const supabase = createSupabaseMock({ userId: "u1" });
    mockCheckQuota(supabase);
    mockConsumeQuota(supabase);
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1", root_node_id: rootNodeId },
      error: null,
    }));
    supabase.__setQueryHandler("mindmap_nodes.select", async () => ({
      data: [
        {
          id: rootNodeId,
          parent_id: null,
          text: "Root",
          notes: null,
          order_index: 0,
        },
      ],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mindmapId: "m1",
          scope: "global",
          userMessage: "Please add a node",
          dryRun: true,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as unknown;
    expect(json).toMatchObject({
      ok: true,
      provider: "azure-openai",
      model: "gpt-5-mini",
      dryRun: true,
      persistence: { chatPersisted: false },
    });

    expect(supabase.__calls.rpcs.map((c) => c.fn)).toEqual([
      "mma_check_quota",
      "mma_consume_quota",
    ]);
  });

  test("POST returns 400 CONSTRAINT_VIOLATION when model outputs delete_node and allowDelete is false", async () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000001";
    openaiMocks.state.response.output_text = JSON.stringify({
      assistant_message: "Oops",
      operations: [{ type: "delete_node", nodeId: rootNodeId }],
    });

    const supabase = createSupabaseMock({ userId: "u1" });
    mockCheckQuota(supabase);
    mockConsumeQuota(supabase);
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1", root_node_id: rootNodeId },
      error: null,
    }));
    supabase.__setQueryHandler("mindmap_nodes.select", async () => ({
      data: [
        {
          id: rootNodeId,
          parent_id: null,
          text: "Root",
          notes: null,
          order_index: 0,
        },
      ],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mindmapId: "m1",
          scope: "global",
          userMessage: "Delete it",
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, code: "CONSTRAINT_VIOLATION" });
    expect(supabase.__calls.rpcs.map((c) => c.fn)).toEqual(["mma_check_quota"]);
  });

  test("POST returns 429 quota_exceeded when quota is exhausted", async () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000001";
    openaiMocks.state.response.output_text = JSON.stringify({
      assistant_message: "OK",
      operations: [{ type: "rename_node", nodeId: rootNodeId, text: "Root (renamed)" }],
    });

    const supabase = createSupabaseMock({ userId: "u1" });
    mockCheckQuota(supabase, { ok: false, used: 100, limit: 100 });
    mockConsumeQuota(supabase);
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1", root_node_id: rootNodeId },
      error: null,
    }));
    supabase.__setQueryHandler("mindmap_nodes.select", async () => ({
      data: [{ id: rootNodeId, parent_id: null, text: "Root", notes: null, order_index: 0 }],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mindmapId: "m1",
          scope: "global",
          userMessage: "Rename root",
          dryRun: true,
        }),
      }),
    );

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({
      ok: false,
      code: "quota_exceeded",
      upgradeUrl: "/pricing",
    });
    expect(openaiMocks.createAzureOpenAIClient).not.toHaveBeenCalled();
    expect(supabase.__calls.rpcs.map((c) => c.fn)).toEqual(["mma_check_quota"]);
  });

  test("POST returns 400 SCOPE_VIOLATION when node-scoped operations modify outside subtree", async () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000001";
    const studyId = "00000000-0000-4000-8000-000000000002";
    const workId = "00000000-0000-4000-8000-000000000003";

    openaiMocks.state.response.output_text = JSON.stringify({
      assistant_message: "Renamed.",
      operations: [{ type: "rename_node", nodeId: workId, text: "Work!" }],
    });

    const supabase = createSupabaseMock({ userId: "u1" });
    mockCheckQuota(supabase);
    mockConsumeQuota(supabase);
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1", root_node_id: rootNodeId },
      error: null,
    }));
    supabase.__setQueryHandler("mindmap_nodes.select", async () => ({
      data: [
        { id: rootNodeId, parent_id: null, text: "Root", notes: null, order_index: 0 },
        { id: studyId, parent_id: rootNodeId, text: "Study", notes: null, order_index: 0 },
        { id: workId, parent_id: rootNodeId, text: "Work", notes: null, order_index: 1 },
      ],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mindmapId: "m1",
          scope: "node",
          selectedNodeId: studyId,
          userMessage: "Rename work",
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, code: "SCOPE_VIOLATION" });
    expect(supabase.__calls.rpcs.map((c) => c.fn)).toEqual(["mma_check_quota"]);
  });

  test("POST persists chat messages when dryRun is false and persistence is available", async () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000001";
    openaiMocks.state.response.output_text = JSON.stringify({
      assistant_message: "OK",
      operations: [{ type: "add_node", nodeId: "n1", parentId: rootNodeId, text: "New" }],
    });

    const supabase = createSupabaseMock({ userId: "u1" });
    mockCheckQuota(supabase);
    mockConsumeQuota(supabase);
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1", root_node_id: rootNodeId },
      error: null,
    }));
    supabase.__setQueryHandler("mindmap_nodes.select", async () => ({
      data: [{ id: rootNodeId, parent_id: null, text: "Root", notes: null, order_index: 0 }],
      error: null,
    }));
    supabase.__setQueryHandler("chat_threads.select", async () => ({
      data: { id: "t1" },
      error: null,
    }));
    supabase.__setQueryHandler("chat_messages.insert", async (ctx) => {
      const values = ctx.values as unknown;
      expect(Array.isArray(values)).toBe(true);
      const rows = values as Array<Record<string, unknown>>;
      const assistant = rows.find((row) => row.role === "assistant");
      expect(assistant).toBeTruthy();
      expect(assistant?.metadata).toMatchObject({
        constraints: {
          outputLanguage: "en",
          branchCount: 4,
          depth: 2,
          allowMove: true,
          allowDelete: false,
        },
        changeSummary: { add: 1, rename: 0, move: 0, delete: 0, reorder: 0 },
        deleteImpact: { nodes: 0 },
        scope: "global",
        selectedNodeId: null,
        dryRun: false,
      });
      return { data: null, error: null };
    });
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mindmapId: "m1",
          scope: "global",
          userMessage: "Add a node",
          constraints: {
            outputLanguage: "en",
            branchCount: 4,
            depth: 2,
            allowMove: true,
            allowDelete: false,
          },
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, persistence: { chatPersisted: true } });
    expect(supabase.__calls.rpcs.map((c) => c.fn)).toEqual([
      "mma_check_quota",
      "mma_consume_quota",
    ]);
  });

  test("POST does not consume quota when model output is invalid", async () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000001";
    openaiMocks.state.response.output_text = "not json";

    const supabase = createSupabaseMock({ userId: "u1" });
    mockCheckQuota(supabase);
    mockConsumeQuota(supabase);
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1", root_node_id: rootNodeId },
      error: null,
    }));
    supabase.__setQueryHandler("mindmap_nodes.select", async () => ({
      data: [{ id: rootNodeId, parent_id: null, text: "Root", notes: null, order_index: 0 }],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mindmapId: "m1",
          scope: "global",
          userMessage: "Do something",
          dryRun: true,
        }),
      }),
    );

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false });
    expect(supabase.__calls.rpcs.map((c) => c.fn)).toEqual(["mma_check_quota"]);
  });

  test("POST returns 429 when check passes but consume is denied (concurrency edge)", async () => {
    const rootNodeId = "00000000-0000-4000-8000-000000000001";
    openaiMocks.state.response.output_text = JSON.stringify({
      assistant_message: "OK",
      operations: [{ type: "rename_node", nodeId: rootNodeId, text: "Root (renamed)" }],
    });

    const supabase = createSupabaseMock({ userId: "u1" });
    mockCheckQuota(supabase, { ok: true, used: 99, limit: 100 });
    mockConsumeQuota(supabase, { ok: false, used: 100, limit: 100 });
    supabase.__setQueryHandler("mindmaps.select", async () => ({
      data: { id: "m1", root_node_id: rootNodeId },
      error: null,
    }));
    supabase.__setQueryHandler("mindmap_nodes.select", async () => ({
      data: [{ id: rootNodeId, parent_id: null, text: "Root", notes: null, order_index: 0 }],
      error: null,
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mindmapId: "m1",
          scope: "global",
          userMessage: "Rename root",
        }),
      }),
    );

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ ok: false, code: "quota_exceeded" });
    expect(supabase.__calls.rpcs.map((c) => c.fn)).toEqual([
      "mma_check_quota",
      "mma_consume_quota",
    ]);
    expect(supabase.__calls.queries.some((q) => q.table === "chat_threads")).toBe(false);
    expect(
      supabase.__calls.queries.some((q) => q.table === "chat_messages" && q.operation === "insert"),
    ).toBe(false);
  });
});
