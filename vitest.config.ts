import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "packages/*/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["packages/*/src/**/*.test.ts", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@vigil/core": path.resolve(import.meta.dirname, "packages/core/src"),
      "@vigil/github": path.resolve(import.meta.dirname, "packages/github/src"),
      "@vigil/executors": path.resolve(import.meta.dirname, "packages/executors/src"),
    },
  },
});
