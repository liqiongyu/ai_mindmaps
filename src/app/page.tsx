import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">MindMaps AI (MMA)</h1>
      <p className="text-zinc-600 dark:text-zinc-300">
        这是 MMA 的工程化骨架（PRD、CI、GitHub 模板与 Next.js 初始化）。下一步会实现导图画布、
        Supabase 持久化与 AI ops 协议。
      </p>
      <div className="flex flex-col gap-2 text-sm">
        <Link className="underline" href="/login">
          /login
        </Link>
        <Link className="underline" href="/signup">
          /signup
        </Link>
        <Link className="underline" href="/mindmaps">
          /mindmaps（需要登录）
        </Link>
        <Link className="underline" href="/mindmaps/demo">
          /mindmaps/demo（编辑器 demo）
        </Link>
        <a className="underline" href="/api/ai/chat">
          /api/ai/chat（占位）
        </a>
      </div>
    </main>
  );
}
