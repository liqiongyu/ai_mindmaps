import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlanKeyFromEnv, getUpgradeUrlFromEnv } from "@/lib/usage/plan";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function generatePublicSlug(): string {
  return crypto.randomUUID();
}

function isMissingPlanLimitsSchema(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST205") return true;
  return /could not find the table/i.test(error.message);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ mindmapId: string }> },
) {
  const { mindmapId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const planKey = getPlanKeyFromEnv();
  const upgradeUrl = getUpgradeUrlFromEnv();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const { data: limitRow, error: limitError } = await supabase
    .from("plan_limits")
    .select("limit,is_enabled")
    .eq("plan", planKey)
    .eq("metric", "public_shares")
    .eq("period", "active")
    .maybeSingle();

  if (limitError && !isMissingPlanLimitsSchema(limitError)) {
    return jsonError(500, "Failed to load plan limits", { detail: limitError.message });
  }

  const shareLimit =
    limitRow && (limitRow as { is_enabled?: unknown }).is_enabled === true
      ? typeof (limitRow as { limit?: unknown }).limit === "number"
        ? ((limitRow as { limit: number }).limit as number)
        : null
      : null;

  if (shareLimit !== null) {
    const { data: mindmap, error: mindmapError } = await supabase
      .from("mindmaps")
      .select("id,is_public")
      .eq("id", mindmapId)
      .eq("owner_id", data.user.id)
      .maybeSingle();

    if (mindmapError) {
      return jsonError(500, "Failed to load mindmap", { detail: mindmapError.message });
    }
    if (!mindmap) {
      return jsonError(404, "Mindmap not found");
    }

    if (!(mindmap as { is_public?: unknown }).is_public) {
      const { count, error: countError } = await supabase
        .from("mindmaps")
        .select("id", { count: "exact" })
        .eq("owner_id", data.user.id)
        .eq("is_public", true)
        .limit(1);

      if (countError) {
        return jsonError(500, "Failed to check share usage", { detail: countError.message });
      }

      const used = typeof count === "number" ? count : 0;
      if (used >= shareLimit) {
        return jsonError(429, "公开分享已达上限，请停止部分分享或升级套餐。", {
          code: "quota_exceeded",
          metric: "public_shares",
          used,
          limit: shareLimit,
          upgradeUrl,
        });
      }
    }
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
