import { NextResponse } from "next/server";

import { z } from "zod";

import { AiChatConstraintsSchema } from "@/lib/ai/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

const PresetNameSchema = z.string().trim().min(1).max(64);

const UpdatePresetRequestSchema = z
  .object({
    name: PresetNameSchema.optional(),
    constraints: AiChatConstraintsSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.name && !value.constraints) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required",
        path: [],
      });
    }
  });

const PresetRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    config: AiChatConstraintsSchema,
    updated_at: z.string(),
  })
  .strict();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ presetId: string }> },
) {
  const { presetId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = UpdatePresetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid request body", { issues: parsed.error.issues });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.name) update.name = parsed.data.name;
  if (parsed.data.constraints) update.config = parsed.data.constraints;

  const { data: updated, error: updateError } = await supabase
    .from("ai_constraint_presets")
    .update(update)
    .eq("id", presetId)
    .eq("owner_id", data.user.id)
    .select("id,name,config,updated_at")
    .maybeSingle();

  if (updateError) {
    return jsonError(500, "Failed to update preset", { detail: updateError.message });
  }

  if (!updated) {
    return jsonError(404, "Preset not found");
  }

  const rowParsed = PresetRowSchema.safeParse(updated);
  if (!rowParsed.success) {
    return jsonError(500, "Failed to parse preset");
  }

  return NextResponse.json({
    ok: true,
    preset: {
      id: rowParsed.data.id,
      name: rowParsed.data.name,
      constraints: rowParsed.data.config,
      updatedAt: rowParsed.data.updated_at,
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ presetId: string }> },
) {
  const { presetId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("ai_constraint_presets")
    .delete()
    .eq("id", presetId)
    .eq("owner_id", data.user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    return jsonError(500, "Failed to delete preset", { detail: deleteError.message });
  }

  if (!deleted) {
    return jsonError(404, "Preset not found");
  }

  return NextResponse.json({ ok: true });
}
