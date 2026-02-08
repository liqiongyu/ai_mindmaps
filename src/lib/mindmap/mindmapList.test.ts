import { describe, expect, test } from "vitest";

import {
  MindmapListQuerySchema,
  decodeMindmapListCursor,
  encodeMindmapListCursor,
  listMindmapsPage,
} from "./mindmapList";
import { createSupabaseMock } from "../../testUtils/supabaseMock";

describe("mindmap/mindmapList", () => {
  const supabase = {} as unknown as Parameters<typeof listMindmapsPage>[0]["supabase"];

  test("cursor encode/decode roundtrip", () => {
    const encoded = encodeMindmapListCursor({
      updatedAt: "2026-02-08T12:34:56.000Z",
      id: "m1",
    });
    expect(decodeMindmapListCursor(encoded)).toEqual({
      updatedAt: "2026-02-08T12:34:56.000Z",
      id: "m1",
    });
  });

  test("decodeMindmapListCursor returns null for invalid input", () => {
    expect(decodeMindmapListCursor("not-base64url")).toBeNull();
  });

  test("MindmapListQuerySchema defaults and trims", () => {
    const parsed = MindmapListQuerySchema.parse({ q: "  hello  " });
    expect(parsed.limit).toBe(20);
    expect(parsed.q).toBe("hello");
  });

  test("listMindmapsPage rejects invalid cursor before querying", async () => {
    const result = await listMindmapsPage({
      supabase,
      userId: "u1",
      cursor: "bad-cursor",
      limit: 20,
      q: null,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.message).toBe("Invalid cursor");
  });

  test("listMindmapsPage rejects invalid limit before querying", async () => {
    const result = await listMindmapsPage({
      supabase,
      userId: "u1",
      cursor: null,
      limit: 0,
      q: null,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error");
    expect(result.message).toBe("Invalid query");
  });

  test("listMindmapsPage returns items + nextCursor when there are more rows", async () => {
    const supabaseMock = createSupabaseMock({ userId: "u1" });
    supabaseMock.__setQueryHandler("mindmaps.select", async (ctx) => {
      expect(ctx.limit).toBe(3);
      expect(ctx.order).toEqual([
        { column: "updated_at", ascending: false },
        { column: "id", ascending: false },
      ]);
      return {
        data: [
          {
            id: "m3",
            title: "C",
            updated_at: "2026-02-08T00:00:03.000Z",
            is_public: false,
            public_slug: null,
          },
          {
            id: "m2",
            title: "B",
            updated_at: "2026-02-08T00:00:02.000Z",
            is_public: false,
            public_slug: null,
          },
          {
            id: "m1",
            title: "A",
            updated_at: "2026-02-08T00:00:01.000Z",
            is_public: false,
            public_slug: null,
          },
        ],
        error: null,
        count: 3,
      };
    });

    const result = await listMindmapsPage({
      supabase: supabaseMock as unknown as Parameters<typeof listMindmapsPage>[0]["supabase"],
      userId: "u1",
      cursor: null,
      limit: 2,
      q: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.items.map((m) => m.id)).toEqual(["m3", "m2"]);
    expect(result.total).toBe(3);
    expect(result.nextCursor).not.toBeNull();
    const cursor = decodeMindmapListCursor(result.nextCursor ?? "");
    expect(cursor).toEqual({ updatedAt: "2026-02-08T00:00:02.000Z", id: "m2" });
  });

  test("listMindmapsPage forwards q filter to supabase query", async () => {
    const supabaseMock = createSupabaseMock({ userId: "u1" });
    supabaseMock.__setQueryHandler("mindmaps.select", async (ctx) => {
      expect(ctx.filters).toEqual(
        expect.arrayContaining([{ type: "ilike", column: "title", pattern: "%hello%" }]),
      );
      return {
        data: [],
        error: null,
        count: 0,
      };
    });

    const result = await listMindmapsPage({
      supabase: supabaseMock as unknown as Parameters<typeof listMindmapsPage>[0]["supabase"],
      userId: "u1",
      cursor: null,
      limit: 1,
      q: "hello",
    });

    expect(result.ok).toBe(true);
  });

  test("listMindmapsPage forwards cursor filter to supabase query", async () => {
    const cursor = encodeMindmapListCursor({
      updatedAt: "2026-02-08T00:00:02.000Z",
      id: "m2",
    });

    const supabaseMock = createSupabaseMock({ userId: "u1" });
    supabaseMock.__setQueryHandler("mindmaps.select", async (ctx) => {
      expect(ctx.filters).toEqual(
        expect.arrayContaining([
          {
            type: "or",
            expression:
              "updated_at.lt.2026-02-08T00:00:02.000Z,and(updated_at.eq.2026-02-08T00:00:02.000Z,id.lt.m2)",
          },
        ]),
      );
      return { data: [], error: null, count: 0 };
    });

    const result = await listMindmapsPage({
      supabase: supabaseMock as unknown as Parameters<typeof listMindmapsPage>[0]["supabase"],
      userId: "u1",
      cursor,
      limit: 1,
      q: null,
    });

    expect(result.ok).toBe(true);
  });
});
