import { describe, expect, test } from "vitest";

import {
  MindmapListQuerySchema,
  decodeMindmapListCursor,
  encodeMindmapListCursor,
  listMindmapsPage,
} from "./mindmapList";

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
});
