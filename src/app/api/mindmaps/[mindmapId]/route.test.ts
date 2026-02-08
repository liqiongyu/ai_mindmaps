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

describe("/api/mindmaps/[mindmapId] route", () => {
  beforeEach(() => {
    // Ensure dynamic imports are not cached between tests.
    vi.resetModules();
  });

  describe("GET", () => {
    test("returns 401 when unauthorized", async () => {
      mocks.state.supabase = createSupabaseMock({ userId: null });
      const { GET } = await import("./route");

      const res = await GET(new Request("http://localhost/api/mindmaps/m1") as never, {
        params: Promise.resolve({ mindmapId: "m1" }),
      });

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, message: "Unauthorized" });
    });

    test("returns 404 when mindmap not found", async () => {
      const supabase = createSupabaseMock({ userId: "u1" });
      supabase.__setQueryHandler("mindmaps.select", async () => ({ data: null, error: null }));
      mocks.state.supabase = supabase;

      const { GET } = await import("./route");
      const res = await GET(new Request("http://localhost/api/mindmaps/m1") as never, {
        params: Promise.resolve({ mindmapId: "m1" }),
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ ok: false, message: "Mindmap not found" });
    });

    test("returns mindmap snapshot and persistence flags", async () => {
      const supabase = createSupabaseMock({ userId: "u1" });

      supabase.__setQueryHandler("mindmaps.select", async () => ({
        data: {
          id: "m1",
          title: "T",
          root_node_id: "00000000-0000-4000-8000-000000000001",
          updated_at: "2026-02-08T00:00:00.000Z",
          is_public: false,
          public_slug: null,
        },
        error: null,
      }));

      supabase.__setQueryHandler("mindmap_nodes.select", async () => ({
        data: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            parent_id: null,
            text: "Root",
            notes: null,
            order_index: 0,
            pos_x: null,
            pos_y: null,
          },
        ],
        error: null,
      }));

      supabase.__setQueryHandler("chat_threads.select", async () => ({
        data: null,
        error: { code: "PGRST205", message: "could not find the table" },
      }));

      supabase.__setQueryHandler("mindmap_ui_state.select", async () => ({
        data: null,
        error: { code: "PGRST205", message: "could not find the table" },
      }));

      mocks.state.supabase = supabase;

      const { GET } = await import("./route");
      const res = await GET(new Request("http://localhost/api/mindmaps/m1") as never, {
        params: Promise.resolve({ mindmapId: "m1" }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as unknown;
      expect(json).toMatchObject({
        ok: true,
        mindmap: {
          id: "m1",
          title: "T",
          rootNodeId: "00000000-0000-4000-8000-000000000001",
          isPublic: false,
          publicSlug: null,
        },
        ui: null,
        persistence: {
          chat: false,
          uiState: false,
        },
      });
    });
  });

  describe("DELETE", () => {
    test("returns 401 when unauthorized", async () => {
      mocks.state.supabase = createSupabaseMock({ userId: null });
      const { DELETE } = await import("./route");

      const res = await DELETE(new Request("http://localhost/api/mindmaps/m1") as never, {
        params: Promise.resolve({ mindmapId: "m1" }),
      });

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, message: "Unauthorized" });
    });

    test("returns 404 when mindmap not found", async () => {
      const supabase = createSupabaseMock({ userId: "u1" });
      supabase.__setQueryHandler("mindmaps.delete", async () => ({ data: null, error: null }));
      mocks.state.supabase = supabase;

      const { DELETE } = await import("./route");
      const res = await DELETE(new Request("http://localhost/api/mindmaps/m1") as never, {
        params: Promise.resolve({ mindmapId: "m1" }),
      });

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ ok: false, message: "Mindmap not found" });
    });

    test("deletes mindmap", async () => {
      const supabase = createSupabaseMock({ userId: "u1" });
      supabase.__setQueryHandler("mindmaps.delete", async () => ({
        data: { id: "m1" },
        error: null,
      }));
      mocks.state.supabase = supabase;

      const { DELETE } = await import("./route");
      const res = await DELETE(new Request("http://localhost/api/mindmaps/m1") as never, {
        params: Promise.resolve({ mindmapId: "m1" }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });
  });
});
