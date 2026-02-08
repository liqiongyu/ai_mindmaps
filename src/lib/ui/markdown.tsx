"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#")) return true;

  try {
    const url = new URL(trimmed, "https://example.com");
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

export function SafeMarkdown({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a: ({ children, href }) => {
            if (!href || !isSafeHref(href)) {
              return <span>{children}</span>;
            }
            return (
              <a
                className="underline underline-offset-2"
                href={href}
                rel="noreferrer noopener"
                target="_blank"
              >
                {children}
              </a>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="mt-2 border-l-2 border-zinc-200 pl-3 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const inline = !className;
            if (inline) {
              return (
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-[12px] dark:bg-zinc-900">
                  {children}
                </code>
              );
            }
            return <code className="text-[12px]">{children}</code>;
          },
          h1: ({ children }) => <h1 className="mt-3 text-base font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-3 text-sm font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-3 text-sm font-medium">{children}</h3>,
          li: ({ children }) => <li className="mt-1">{children}</li>,
          ol: ({ children }) => <ol className="mt-2 list-decimal pl-4">{children}</ol>,
          p: ({ children }) => <p className="mt-2 first:mt-0">{children}</p>,
          pre: ({ children }) => (
            <pre className="mt-2 overflow-auto rounded bg-zinc-100 p-2 dark:bg-zinc-900">
              {children}
            </pre>
          ),
          ul: ({ children }) => <ul className="mt-2 list-disc pl-4">{children}</ul>,
        }}
        rehypePlugins={[rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
