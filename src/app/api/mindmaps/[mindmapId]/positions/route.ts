import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const UpdateMindmapNodePositionsRequestSchema = z
  .object({
    positions: z
      .array(
        z.object({
          nodeId: z.string().min(1),
          x: z.number().finite(),
          y: z.number().finite(),
        }),
      )
      .min(1),
  })
  .strict();

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function isMissingPositionRpc(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST202") return true;
  return /could not find the function/i.test(error.message);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mindmapId: string }> },
) {
  const { mindmapId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = UpdateMindmapNodePositionsRequestSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(400, "Invalid request body", { issues: parsed.error.issues });
  }

  const rpcPayload = parsed.data.positions.map((p) => ({
    id: p.nodeId,
    pos_x: p.x,
    pos_y: p.y,
  }));

  const { error: rpcError } = await supabase.rpc("mma_update_mindmap_node_positions", {
    p_mindmap_id: mindmapId,
    p_positions: rpcPayload,
  });

  if (!rpcError) {
    return NextResponse.json({ ok: true });
  }

  if (!isMissingPositionRpc(rpcError)) {
    return jsonError(500, "Failed to update node positions", { detail: rpcError.message });
  }

  // Fallback path (RPC not deployed): best-effort row updates.
  for (const pos of parsed.data.positions) {
    const { error: updateError } = await supabase
      .from("mindmap_nodes")
      .update({ pos_x: pos.x, pos_y: pos.y })
      .eq("mindmap_id", mindmapId)
      .eq("id", pos.nodeId);

    if (updateError) {
      return jsonError(500, "Failed to update node positions", { detail: updateError.message });
    }
  }

  // Keep mindmaps.updated_at in sync (best-effort).
  await supabase
    .from("mindmaps")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", mindmapId)
    .eq("owner_id", data.user.id);

  return NextResponse.json({ ok: true });
}
