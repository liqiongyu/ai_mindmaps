import Link from "next/link";

import { LandingTrackLink } from "./LandingTrackLink";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <Link className="text-sm font-semibold tracking-tight" href="/">
            MindMaps AI
          </Link>

          <nav className="flex items-center gap-2">
            <LandingTrackLink
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              event="landing_cta_click"
              eventProps={{ placement: "header" }}
              href="/try"
            >
              立即体验
            </LandingTrackLink>
            <Link
              className="px-2 py-2 text-sm text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white"
              href="/login"
            >
              登录
            </Link>
            <Link
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              href="/signup"
            >
              注册
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16">
        <section className="grid items-start gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                对话生成“可控”的思维导图
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-300">
                用自然语言扩展结构；每次 AI 改动都会以 ops 形式应用，并支持撤销/重做。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <LandingTrackLink
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                event="landing_cta_click"
                eventProps={{ placement: "hero" }}
                href="/try"
              >
                立即体验（免登录）
              </LandingTrackLink>
              <Link
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                href="/login"
              >
                登录继续
              </Link>
              <Link
                className="text-sm text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-200"
                href="/signup"
              >
                注册并保存到云端
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 dark:border-zinc-800 dark:bg-zinc-950">
                无需安装
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 dark:border-zinc-800 dark:bg-zinc-950">
                支持导出 PNG/SVG
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 dark:border-zinc-800 dark:bg-zinc-950">
                可生成公开分享链接（登录后）
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-medium">为什么是“可控”</div>
            <ul className="mt-4 space-y-3 text-sm text-zinc-700 dark:text-zinc-200">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                <span>
                  <span className="font-medium">对话改图：</span>
                  用自然语言扩展/重组结构
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                <span>
                  <span className="font-medium">可控 ops：</span>
                  每次改动可审计、可校验
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                <span>
                  <span className="font-medium">可撤销：</span>
                  AI 与手工操作共享撤销栈
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">30 秒上手</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              进入试玩 → 编辑结构 → 导出或登录保存
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="text-xs font-medium text-zinc-500">Step 1</div>
              <div className="mt-1 text-sm font-medium">进入试玩</div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                免登录打开画布，开始编辑。
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="text-xs font-medium text-zinc-500">Step 2</div>
              <div className="mt-1 text-sm font-medium">扩展结构</div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                手工微调结构；登录后可用 AI 对话扩展。
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="text-xs font-medium text-zinc-500">Step 3</div>
              <div className="mt-1 text-sm font-medium">导出/分享/保存</div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                导出 PNG/SVG；登录后可云端保存与分享链接。
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="text-lg font-semibold tracking-tight">FAQ</h2>
          <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <details className="group rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <summary className="cursor-pointer text-sm font-medium select-none">
                AI 如何修改导图？
              </summary>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                AI 只能通过 ops 对导图做结构化修改。每次改动都可见、可校验，并且支持撤销/重做。
              </p>
            </details>
            <details className="group rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <summary className="cursor-pointer text-sm font-medium select-none">
                试玩和登录有什么区别？
              </summary>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                试玩用于体验编辑器手感。登录后可使用 AI、云端保存与公开分享链接。
              </p>
            </details>
            <details className="group rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <summary className="cursor-pointer text-sm font-medium select-none">
                数据是否安全？会用于训练吗？
              </summary>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                默认不将你的导图与对话用于训练（后续将提供完整隐私政策页面）。
              </p>
            </details>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-zinc-200 pt-8 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
          <div>默认不将你的导图与对话用于训练（MVP 文案）。</div>
          <div className="flex flex-wrap gap-4">
            <span>隐私</span>
            <span>安全</span>
            <span>联系</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
