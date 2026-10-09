import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Talks to the real Supabase project with two ordinary test accounts. Run with `npm run test:rls`.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
