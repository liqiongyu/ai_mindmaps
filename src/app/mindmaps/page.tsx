import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "./SignOutButton";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MindmapsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">My mindmaps</h1>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">{data.user.email}</div>
        </div>
        <SignOutButton />
      </header>

      <div className="flex flex-col gap-2 text-sm">
        <Link className="underline" href="/mindmaps/demo">
          Open demo editor
        </Link>
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-200">
        Persistence is not implemented yet. Next step: create mindmaps in Supabase and load/save
        them here.
      </div>
    </main>
  );
}
