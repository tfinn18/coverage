import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the local dev server and the real Supabase project,
// signing in with test account A from .env.local. Run: npm run test:e2e
// To test the deployed site instead: E2E_BASE_URL=https://coverage-green.vercel.app npm run test:e2e
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const local = baseURL.startsWith("http://localhost");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: local
    ? { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 }
    : undefined,
});
