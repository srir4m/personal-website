import { expect, test } from "@playwright/test";

test("no white flash: the document is parchment before any script runs", async ({ page }) => {
  await page.route("**/*.js", (route) => new Promise((resolve) => setTimeout(() => resolve(route.continue()), 500)));
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector("body");
  const background = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(background).toBe("rgb(239, 228, 204)");
});

test("boot holds scrolling until the globe is ready, then shows the scroll cue", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator("[data-boot-ready]");
  await expect(stage).toHaveAttribute("data-boot-ready", "true", { timeout: 5000 });
  await expect(page.locator(".scroll-cue")).toHaveAttribute("data-shown", "true");
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test("the globe card shows the owner's area, coarsely", async ({ page }) => {
  await page.goto("/#globe");
  const card = page.locator(".globe-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("New York area");
  await expect(card).toContainText("40.7°N 74.0°W");
  // Education moved to the body map (PRD v1.1, Q1).
  await expect(card).not.toContainText("Stevens");
});

test("the course log lives in the Backbone panel, newest term first", async ({ page }) => {
  await page.goto("/#body");
  await page.getByRole("button", { name: /^Backbone/ }).focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: "Backbone" });
  await expect(panel).toContainText("B.S. Computer Science");
  const button = panel.getByRole("button", { name: "Course log" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(panel.locator(".course-log h4").first()).toHaveText("2026 Fall");
  await expect(panel.locator(".course-log .hud-tag")).toHaveCount(6);
  await expect(panel.locator(".course-log")).toContainText("Systems Programming");
});
