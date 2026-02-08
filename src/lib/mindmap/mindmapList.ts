import { z } from "zod";

import { createSupabaseServerClient } from "../supabase/server";

export type MindmapListItem = {
  id: string;
  title: string;
  updatedAt: string;
  isPublic: boolean;
  publicSlug: string | null;
};

const MindmapListCursorSchema = z
  .object({
    updatedAt: z.string(),
    id: z.string(),
  })
  .strict();

export type MindmapListCursor = z.infer<typeof MindmapListCursorSchema>;

export const MindmapListQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    q: z.string().optional(),
  })
  .strict()
  .transform((value) => {
    const q = value.q?.trim() ? value.q.trim() : undefined;
    return {
      cursor: value.cursor,
      limit: value.limit ?? 20,
      q,
    };
  });

export type MindmapListQuery = z.infer<typeof MindmapListQuerySchema>;

const MindmapListRowSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    updated_at: z.string(),
    is_public: z.boolean(),
    public_slug: z.string().nullable(),
  })
  .strict();

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function encodeMindmapListCursor(cursor: MindmapListCursor): string {
  return encodeBase64Url(JSON.stringify(cursor));
}

export function decodeMindmapListCursor(encoded: string): MindmapListCursor | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(encoded)) as unknown;
    const checked = MindmapListCursorSchema.safeParse(parsed);
    return checked.success ? checked.data : null;
  } catch {
    return null;
  }
}

export async function listMindmapsPage(args: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  cursor?: string | null;
  limit?: number | null;
  q?: string | null;
}): Promise<
  | {
      ok: true;
      items: MindmapListItem[];
      nextCursor: string | null;
      total: number;
    }
  | { ok: false; message: string }
> {
  const parsedQuery = MindmapListQuerySchema.safeParse({
    cursor: args.cursor ?? undefined,
    limit: args.limit ?? undefined,
    q: args.q ?? undefined,
  });

  if (!parsedQuery.success) {
    return { ok: false, message: "Invalid query" };
  }

  const { cursor, limit, q } = parsedQuery.data;
  const decodedCursor = cursor ? decodeMindmapListCursor(cursor) : null;
  if (cursor && !decodedCursor) {
    return { ok: false, message: "Invalid cursor" };
  }

  const fetchLimit = limit + 1;
  let query = args.supabase
    .from("mindmaps")
    .select("id,title,updated_at,is_public,public_slug", { count: "exact" })
    .eq("owner_id", args.userId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(fetchLimit);

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  if (decodedCursor) {
    query = query.or(
      `updated_at.lt.${decodedCursor.updatedAt},and(updated_at.eq.${decodedCursor.updatedAt},id.lt.${decodedCursor.id})`,
    );
  }

  const { data: rows, error, count } = await query;
  if (error) {
    return { ok: false, message: error.message };
  }

  const parsedRows = z.array(MindmapListRowSchema).safeParse(rows ?? []);
  if (!parsedRows.success) {
    return { ok: false, message: "Failed to parse mindmaps" };
  }

  const pageRows = parsedRows.data.slice(0, limit);
  const nextCursor =
    parsedRows.data.length > limit && pageRows.length > 0
      ? encodeMindmapListCursor({
          updatedAt: pageRows[pageRows.length - 1].updated_at,
          id: pageRows[pageRows.length - 1].id,
        })
      : null;

  return {
    ok: true,
    items: pageRows.map((m) => ({
      id: m.id,
      title: m.title,
      updatedAt: m.updated_at,
      isPublic: m.is_public,
      publicSlug: m.public_slug,
    })),
    nextCursor,
    total: typeof count === "number" ? count : pageRows.length,
  };
}
