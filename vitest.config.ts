import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["__tests__/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
  resolve: {
    alias: { "@": here },
  },
});
