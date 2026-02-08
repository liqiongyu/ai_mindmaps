import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, stat } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const READY_TIMEOUT_MS = 60_000;

function getE2eServerEnv(port: number): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? "1",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "dummy-anon-key",
    PORT: String(port),
  };
}

async function getAvailablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to acquire a local port")));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHttpOk(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }

    await sleep(250);
  }

  throw new Error(`Timed out waiting for ${url} to be ready: ${String(lastError)}`);
}

describe("ui journey (e2e)", () => {
  let baseUrl: string;
  let serverProcess: ChildProcessWithoutNullStreams | null = null;
  const serverLogs: string[] = [];

  beforeAll(async () => {
    const port = await getAvailablePort();
    baseUrl = `http://127.0.0.1:${port}`;

    serverProcess = spawn("pnpm", ["-s", "exec", "next", "dev", ".", "-p", String(port)], {
      cwd: process.cwd(),
      env: getE2eServerEnv(port),
      stdio: "pipe",
    });

    serverProcess.stdout.setEncoding("utf8");
    serverProcess.stderr.setEncoding("utf8");

    serverProcess.stdout.on("data", (chunk: string) => {
      serverLogs.push(chunk);
      if (serverLogs.length > 500) serverLogs.splice(0, serverLogs.length - 500);
    });
    serverProcess.stderr.on("data", (chunk: string) => {
      serverLogs.push(chunk);
      if (serverLogs.length > 500) serverLogs.splice(0, serverLogs.length - 500);
    });

    const exited = once(serverProcess, "exit").then(([code]) => code);

    await Promise.race([
      waitForHttpOk(`${baseUrl}/`, READY_TIMEOUT_MS),
      exited.then((code) => {
        const tail = serverLogs.join("").trim().split("\n").slice(-40).join("\n");
        throw new Error(`Next dev server exited early (code=${code}). Logs:\n${tail}`);
      }),
    ]);
  }, 120_000);

  afterAll(async () => {
    if (!serverProcess) return;
    serverProcess.kill("SIGTERM");
    const exited = once(serverProcess, "exit");
    const result = await Promise.race([exited.then(() => "exited"), sleep(5_000).then(() => null)]);
    if (!result) {
      serverProcess.kill("SIGKILL");
      await Promise.race([exited, sleep(5_000)]);
    }
  }, 30_000);

  test("Landing -> Try -> Edit -> Export (PNG)", async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);

    await page.goto(baseUrl, { waitUntil: "load" });
    const heroTryLink = page.getByRole("link", { name: "立即体验（免登录）" });
    const headerTryLink = page.getByRole("link", { name: "立即体验" });
    try {
      await heroTryLink.waitFor({ timeout: 10_000 });
      await page.waitForTimeout(500);
      await heroTryLink.click();
    } catch {
      await headerTryLink.waitFor({ timeout: 10_000 });
      await headerTryLink.click();
    }
    await page.waitForURL((url) => url.pathname === "/try");

    await page.getByRole("button", { name: "MindMaps AI" }).waitFor();
    await page.getByRole("button", { name: "新增子节点" }).click();
    const newNodeInput = page.locator("input").first();
    await newNodeInput.waitFor();
    expect(await newNodeInput.inputValue()).toBe("新节点");
    await newNodeInput.press("Enter");
    await page.getByRole("button", { name: "新节点" }).waitFor();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "导出 PNG" }).click(),
    ]);

    expect(download.suggestedFilename()).toBe("mindmap-demo.png");

    const outputDir = await mkdtemp(join(tmpdir(), "mma-ui-e2e-"));
    const outputPath = join(outputDir, download.suggestedFilename());
    await download.saveAs(outputPath);
    const fileStat = await stat(outputPath);
    expect(fileStat.size).toBeGreaterThan(0);

    await context.close();
    await browser.close();
  });
});
