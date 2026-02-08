import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function isMissingTemplatesSchema(error: { code?: string; message: string }): boolean {
  if (error.code === "PGRST205") return true;
  return /could not find the table/i.test(error.message);
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "Unauthorized");
  }

  const { data: items, error: templatesError } = await supabase
    .from("mindmap_templates")
    .select("id,slug,title,description,category")
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (templatesError) {
    if (isMissingTemplatesSchema(templatesError)) {
      return jsonError(503, "Templates schema is missing. Apply Supabase migrations first.", {
        detail: templatesError.message,
      });
    }
    return jsonError(500, "Failed to load templates", { detail: templatesError.message });
  }

  return NextResponse.json({ ok: true, items: items ?? [] });
}
