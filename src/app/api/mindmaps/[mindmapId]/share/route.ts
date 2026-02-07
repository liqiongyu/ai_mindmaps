import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function generatePublicSlug(): string {
  return crypto.randomUUID();
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ mindmapId: string }> },
) {
  const { mindmapId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = generatePublicSlug();
    const { data: updated, error: updateError } = await supabase
      .from("mindmaps")
      .update({ is_public: true, public_slug: slug })
      .eq("id", mindmapId)
      .eq("owner_id", data.user.id)
      .select("public_slug")
      .maybeSingle();

    if (updateError?.code === "23505") {
      continue;
    }
    if (updateError) {
      return jsonError(500, "Failed to share mindmap", { detail: updateError.message });
    }
    if (!updated?.public_slug) {
      return jsonError(404, "Mindmap not found");
    }

    return NextResponse.json({ ok: true, publicSlug: updated.public_slug });
  }

  return jsonError(500, "Failed to generate a unique public slug");
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ mindmapId: string }> },
) {
  const { mindmapId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const { data: updated, error: updateError } = await supabase
    .from("mindmaps")
    .update({ is_public: false, public_slug: null })
    .eq("id", mindmapId)
    .eq("owner_id", data.user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return jsonError(500, "Failed to stop sharing mindmap", { detail: updateError.message });
  }
  if (!updated) {
    return jsonError(404, "Mindmap not found");
  }

  return NextResponse.json({ ok: true });
}
