import { redirect } from "next/navigation";

import { MindmapsListClient } from "./MindmapsListClient";
import { SignOutButton } from "./SignOutButton";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MindmapsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  const { data: mindmaps, error: mindmapsError } = await supabase
    .from("mindmaps")
    .select("id,title,updated_at,is_public,public_slug")
    .eq("owner_id", data.user.id)
    .order("updated_at", { ascending: false });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">My mindmaps</h1>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">{data.user.email}</div>
        </div>
        <SignOutButton />
      </header>

      {mindmapsError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
          Failed to load mindmaps: {mindmapsError.message}
        </div>
      ) : (
        <MindmapsListClient
          initialMindmaps={
            mindmaps?.map((m) => ({
              id: m.id,
              title: m.title,
              updatedAt: m.updated_at,
              isPublic: m.is_public,
              publicSlug: m.public_slug,
            })) ?? []
          }
        />
      )}
    </main>
  );
}
