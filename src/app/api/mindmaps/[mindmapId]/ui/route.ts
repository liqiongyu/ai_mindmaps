import { NextResponse } from "next/server";

import { z } from "zod";

import { MindmapViewportSchema } from "@/lib/mindmap/uiState";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

const MindmapUiStateUpdateSchema = z.object({
  collapsedNodeIds: z.array(z.string().uuid()),
  selectedNodeId: z.string().uuid().nullable(),
  viewport: MindmapViewportSchema.nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mindmapId: string }> },
) {
  const { mindmapId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = MindmapUiStateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid request body");
  }

  const { data: mindmap, error: mindmapError } = await supabase
    .from("mindmaps")
    .select("id,root_node_id")
    .eq("id", mindmapId)
    .eq("owner_id", data.user.id)
    .maybeSingle();

  if (mindmapError) {
    return jsonError(500, "Failed to load mindmap", { detail: mindmapError.message });
  }
  if (!mindmap) {
    return jsonError(404, "Mindmap not found");
  }

  const { error: upsertError } = await supabase.from("mindmap_ui_state").upsert(
    [
      {
        mindmap_id: mindmapId,
        collapsed_node_ids: parsed.data.collapsedNodeIds,
        selected_node_id: parsed.data.selectedNodeId,
        viewport: parsed.data.viewport,
      },
    ],
    { onConflict: "mindmap_id" },
  );

  if (upsertError) {
    return jsonError(500, "Failed to persist mindmap UI state", { detail: upsertError.message });
  }

  return NextResponse.json({ ok: true });
}
