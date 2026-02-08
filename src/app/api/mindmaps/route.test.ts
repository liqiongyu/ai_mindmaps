import { beforeEach, describe, expect, test, vi } from "vitest";

import { createSupabaseMock, type SupabaseMock } from "@/testUtils/supabaseMock";

const mocks = vi.hoisted(() => {
  const state = {
    supabase: null as unknown as SupabaseMock,
  };
  return {
    state,
    createSupabaseServerClient: vi.fn(async () => state.supabase),
    listMindmapsPage: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@/lib/mindmap/mindmapList", () => ({
  listMindmapsPage: mocks.listMindmapsPage,
}));

describe("/api/mindmaps route", () => {
  beforeEach(() => {
    mocks.listMindmapsPage.mockReset();
  });

  describe("GET", () => {
    test("returns 401 when unauthorized", async () => {
      mocks.state.supabase = createSupabaseMock({ userId: null });
      const { GET } = await import("./route");

      const res = await GET(new Request("http://localhost/api/mindmaps") as never);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, message: "Unauthorized" });
      expect(mocks.listMindmapsPage).not.toHaveBeenCalled();
    });

    test("returns paginated mindmaps list", async () => {
      mocks.state.supabase = createSupabaseMock({ userId: "u1" });
      mocks.listMindmapsPage.mockResolvedValue({
        ok: true,
        items: [
          {
            id: "m1",
            title: "Hello",
            updatedAt: "2026-02-08T00:00:00.000Z",
            isPublic: false,
            publicSlug: null,
          },
        ],
        nextCursor: "cursor1",
        total: 42,
      });

      const { GET } = await import("./route");

      const res = await GET(
        new Request("http://localhost/api/mindmaps?cursor=c0&limit=10&q=hi") as never,
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        ok: true,
        items: [
          {
            id: "m1",
            title: "Hello",
            updatedAt: "2026-02-08T00:00:00.000Z",
            isPublic: false,
            publicSlug: null,
          },
        ],
        nextCursor: "cursor1",
        total: 42,
      });

      expect(mocks.listMindmapsPage).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u1",
          cursor: "c0",
          limit: 10,
          q: "hi",
        }),
      );
    });

    test("maps invalid cursor/query to 400 with detail", async () => {
      mocks.state.supabase = createSupabaseMock({ userId: "u1" });
      mocks.listMindmapsPage.mockResolvedValue({ ok: false, message: "Invalid cursor" });
      const { GET } = await import("./route");

      const res = await GET(new Request("http://localhost/api/mindmaps?cursor=bad") as never);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        ok: false,
        message: "Failed to list mindmaps",
        detail: "Invalid cursor",
      });
    });
  });

  describe("POST", () => {
    test("returns 401 when unauthorized", async () => {
      mocks.state.supabase = createSupabaseMock({ userId: null });
      const { POST } = await import("./route");

      const res = await POST(
        new Request("http://localhost/api/mindmaps", { method: "POST" }) as never,
      );
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, message: "Unauthorized" });
    });

    test("returns 400 on invalid request body", async () => {
      mocks.state.supabase = createSupabaseMock({ userId: "u1" });
      const { POST } = await import("./route");

      const res = await POST(
        new Request("http://localhost/api/mindmaps", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ extra: true }),
        }) as never,
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as unknown;
      expect(json).toMatchObject({ ok: false, message: "Invalid request body" });
    });

    test("creates mindmap and root node", async () => {
      const supabase = createSupabaseMock({ userId: "u1" });
      supabase.__setQueryHandler("mindmaps.insert", async () => ({ data: null, error: null }));
      supabase.__setQueryHandler("mindmap_nodes.insert", async () => ({ data: null, error: null }));
      mocks.state.supabase = supabase;

      const { POST } = await import("./route");

      const res = await POST(
        new Request("http://localhost/api/mindmaps", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "My Mindmap" }),
        }) as never,
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as { ok: true; mindmapId: string; rootNodeId: string };
      expect(json.ok).toBe(true);
      expect(json.mindmapId).toMatch(/.+/);
      expect(json.rootNodeId).toMatch(/.+/);

      expect(supabase.__calls.queries.map((q) => `${q.table}.${q.operation}`)).toEqual([
        "mindmaps.insert",
        "mindmap_nodes.insert",
      ]);
    });

    test("rolls back mindmap when root node insert fails", async () => {
      const supabase = createSupabaseMock({ userId: "u1" });
      supabase.__setQueryHandler("mindmaps.insert", async () => ({ data: null, error: null }));
      supabase.__setQueryHandler("mindmap_nodes.insert", async () => ({
        data: null,
        error: { message: "insert failed" },
      }));
      supabase.__setQueryHandler("mindmaps.delete", async () => ({ data: null, error: null }));
      mocks.state.supabase = supabase;

      const { POST } = await import("./route");

      const res = await POST(
        new Request("http://localhost/api/mindmaps", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "My Mindmap" }),
        }) as never,
      );

      expect(res.status).toBe(500);
      expect(await res.json()).toMatchObject({
        ok: false,
        message: "Failed to create root node",
      });

      expect(supabase.__calls.queries.map((q) => `${q.table}.${q.operation}`)).toEqual([
        "mindmaps.insert",
        "mindmap_nodes.insert",
        "mindmaps.delete",
      ]);
    });

    test("creates mindmap from template id", async () => {
      const supabase = createSupabaseMock({ userId: "u1" });
      const templateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      supabase.__setQueryHandler("mindmap_templates.select", async () => ({
        data: {
          id: templateId,
          title: "学习计划",
          state: {
            rootNodeId: "11111111-1111-4aaa-8aaa-111111111111",
            nodesById: {
              "11111111-1111-4aaa-8aaa-111111111111": {
                id: "11111111-1111-4aaa-8aaa-111111111111",
                parentId: null,
                text: "学习计划",
                notes: null,
                orderIndex: 0,
              },
              "22222222-2222-4aaa-8aaa-222222222222": {
                id: "22222222-2222-4aaa-8aaa-222222222222",
                parentId: "11111111-1111-4aaa-8aaa-111111111111",
                text: "目标",
                notes: null,
                orderIndex: 0,
              },
            },
          },
        },
        error: null,
      }));
      supabase.__setQueryHandler("mindmaps.insert", async () => ({ data: null, error: null }));
      supabase.__setRpcHandler("mma_replace_mindmap_nodes", async () => ({
        data: { ok: true, version: 2 },
        error: null,
      }));
      mocks.state.supabase = supabase;

      const { POST } = await import("./route");

      const res = await POST(
        new Request("http://localhost/api/mindmaps", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ templateId }),
        }) as never,
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as { ok: true; mindmapId: string; rootNodeId: string };
      expect(json.ok).toBe(true);
      expect(json.mindmapId).toMatch(/.+/);
      expect(json.rootNodeId).toMatch(/.+/);

      expect(supabase.__calls.queries.map((q) => `${q.table}.${q.operation}`)).toEqual([
        "mindmap_templates.select",
        "mindmaps.insert",
      ]);
      expect(supabase.__calls.rpcs[0]?.fn).toBe("mma_replace_mindmap_nodes");
      expect(supabase.__calls.rpcs[0]?.params.p_base_version).toBe(1);
    });

    test("returns 404 when template id not found", async () => {
      const supabase = createSupabaseMock({ userId: "u1" });
      const templateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      supabase.__setQueryHandler("mindmap_templates.select", async () => ({
        data: null,
        error: null,
      }));
      mocks.state.supabase = supabase;

      const { POST } = await import("./route");

      const res = await POST(
        new Request("http://localhost/api/mindmaps", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ templateId }),
        }) as never,
      );

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ ok: false, message: "Template not found" });
    });

    test("returns 503 when atomic save RPC is missing", async () => {
      const supabase = createSupabaseMock({ userId: "u1" });
      const templateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      supabase.__setQueryHandler("mindmap_templates.select", async () => ({
        data: {
          id: templateId,
          title: "学习计划",
          state: {
            rootNodeId: "11111111-1111-4aaa-8aaa-111111111111",
            nodesById: {
              "11111111-1111-4aaa-8aaa-111111111111": {
                id: "11111111-1111-4aaa-8aaa-111111111111",
                parentId: null,
                text: "学习计划",
                notes: null,
                orderIndex: 0,
              },
            },
          },
        },
        error: null,
      }));
      supabase.__setQueryHandler("mindmaps.insert", async () => ({ data: null, error: null }));
      supabase.__setQueryHandler("mindmaps.delete", async () => ({ data: null, error: null }));
      supabase.__setRpcHandler("mma_replace_mindmap_nodes", async () => ({
        data: null,
        error: {
          code: "PGRST202",
          message: "could not find the function mma_replace_mindmap_nodes",
        },
      }));
      mocks.state.supabase = supabase;

      const { POST } = await import("./route");

      const res = await POST(
        new Request("http://localhost/api/mindmaps", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ templateId }),
        }) as never,
      );

      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({
        ok: false,
        message: "Atomic save RPC is missing. Apply Supabase migrations first.",
      });
      expect(supabase.__calls.queries.map((q) => `${q.table}.${q.operation}`)).toEqual([
        "mindmap_templates.select",
        "mindmaps.insert",
        "mindmaps.delete",
      ]);
    });
  });
});
