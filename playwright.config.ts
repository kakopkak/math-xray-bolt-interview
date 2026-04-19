import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const configuredWorkers = Number(process.env.PLAYWRIGHT_WORKERS ?? "1");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: Number.isFinite(configuredWorkers) && configuredWorkers > 0 ? configuredWorkers : 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.02,
    },
  },
  webServer: {
    command: "npm run dev",
    env: {
      ...process.env,
      DEMO_SEED_TOKEN: process.env.DEMO_SEED_TOKEN ?? "playwright-demo-token",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? baseURL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "playwright-nextauth-secret",
      ALLOW_DEMO_AUTH: process.env.ALLOW_DEMO_AUTH ?? "1",
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
