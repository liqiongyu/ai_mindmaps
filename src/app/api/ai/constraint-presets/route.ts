import { NextResponse } from "next/server";

import { z } from "zod";

import { AiChatConstraintsSchema } from "@/lib/ai/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === "23505";
}

const PresetNameSchema = z.string().trim().min(1).max(64);

const CreatePresetRequestSchema = z
  .object({
    name: PresetNameSchema,
    constraints: AiChatConstraintsSchema,
  })
  .strict();

const PresetRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    config: AiChatConstraintsSchema,
    updated_at: z.string(),
  })
  .strict();

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const { data: rows, error: selectError } = await supabase
    .from("ai_constraint_presets")
    .select("id,name,config,updated_at")
    .eq("owner_id", data.user.id)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false });

  if (selectError) {
    return jsonError(500, "Failed to load presets", { detail: selectError.message });
  }

  const parsed = z.array(PresetRowSchema).safeParse(rows ?? []);
  if (!parsed.success) {
    return jsonError(500, "Failed to parse presets");
  }

  return NextResponse.json({
    ok: true,
    presets: parsed.data.map((p) => ({
      id: p.id,
      name: p.name,
      constraints: p.config,
      updatedAt: p.updated_at,
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = CreatePresetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid request body", { issues: parsed.error.issues });
  }

  const { name, constraints } = parsed.data;

  const { data: inserted, error: insertError } = await supabase
    .from("ai_constraint_presets")
    .insert({
      owner_id: data.user.id,
      name,
      config: constraints,
    })
    .select("id,name,config,updated_at")
    .single();

  if (insertError) {
    if (isUniqueViolation(insertError)) {
      return jsonError(409, "Preset name already exists");
    }
    return jsonError(500, "Failed to create preset", { detail: insertError.message });
  }

  const rowParsed = PresetRowSchema.safeParse(inserted);
  if (!rowParsed.success) {
    return jsonError(500, "Failed to parse preset");
  }

  return NextResponse.json(
    {
      ok: true,
      preset: {
        id: rowParsed.data.id,
        name: rowParsed.data.name,
        constraints: rowParsed.data.config,
        updatedAt: rowParsed.data.updated_at,
      },
    },
    { status: 201 },
  );
}
