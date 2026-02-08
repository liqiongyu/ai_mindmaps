import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MindMaps AI",
  description: "对话生成“可控”的思维导图：ops 可校验、可撤销。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a
          className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow focus:not-sr-only focus:fixed focus:top-4 focus:left-4 dark:bg-zinc-950 dark:text-zinc-100"
          href="#main-content"
        >
          跳转到主内容
        </a>
        <div className="outline-none" id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
