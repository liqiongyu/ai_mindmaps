"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">注册</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">创建账号以启用 AI 与云端保存。</p>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError(null);
          try {
            const { error } = await supabase.auth.signUp({
              email: email.trim(),
              password,
            });
            if (error) throw error;
            router.push("/mindmaps");
            router.refresh();
          } catch (err) {
            const message = err instanceof Error ? err.message : "注册失败";
            setError(message);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-200">邮箱</span>
          <input
            autoComplete="email"
            className="rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:focus:ring-zinc-700"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-200">密码</span>
          <input
            autoComplete="new-password"
            className="rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:focus:ring-zinc-700"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
            操作失败：{error}
          </div>
        ) : null}

        <button
          className="mt-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "创建中…" : "创建账号"}
        </button>

        <div className="text-center text-sm text-zinc-600 dark:text-zinc-300">
          已有账号？{" "}
          <Link className="underline" href="/login">
            登录
          </Link>
        </div>
      </form>
    </main>
  );
}
