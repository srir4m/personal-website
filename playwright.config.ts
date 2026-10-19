import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Cloud containers ship a pre-installed Chromium; use it when present instead of downloading one.
const localChromium = "/opt/pw-browsers/chromium";
const executablePath = process.env.PW_CHROMIUM_PATH ?? (existsSync(localChromium) ? localChromium : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // One retry in CI absorbs runner hiccups; tests that only pass on retry are still reported as flaky.
  retries: process.env.CI ? 1 : 0,
  // In CI, the GitHub reporter turns each failure into an annotation on the run.
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    // SwiftShader gives headless Chromium a software WebGL, so the globe really renders.
    launchOptions: { executablePath, args: ["--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    // The e2e build swaps in the fixture vault (see vaultModule in vite.config.ts).
    command: "npx vite build --mode e2e --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
