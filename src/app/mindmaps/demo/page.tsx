import { redirect } from "next/navigation";

import { MindmapEditor } from "../[mindmapId]/MindmapEditor";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MindmapDemoPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return <MindmapEditor mode="demo" />;
}
