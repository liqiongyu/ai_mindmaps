import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.e2e.test.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "json-summary", "lcov"],
      include: [
        "src/lib/mindmap/**/*.{ts,tsx}",
        "src/lib/ai/**/*.{ts,tsx}",
        "src/app/api/**/*.{ts,tsx}",
      ],
      exclude: ["**/*.test.ts", "**/*.e2e.test.ts", "**/*.d.ts", "src/e2e/**"],
      thresholds: {
        "src/lib/mindmap/**": { lines: 90, statements: 90, functions: 90, branches: 82 },
        "src/lib/ai/**": { lines: 85, statements: 85, functions: 85, branches: 76 },
        "src/app/api/**": { lines: 75, statements: 75, functions: 70, branches: 57 },
      },
    },
  },
});
