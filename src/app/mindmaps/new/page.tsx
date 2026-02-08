import Link from "next/link";
import { redirect } from "next/navigation";

import { MindmapsNewClient } from "./MindmapsNewClient";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MindmapsNewPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login?next=/mindmaps/new");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">新建导图</h1>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            从模板开始，减少空白页焦虑。
          </div>
        </div>
        <Link className="text-sm underline" href="/mindmaps">
          返回列表
        </Link>
      </header>

      <MindmapsNewClient />
    </main>
  );
}
