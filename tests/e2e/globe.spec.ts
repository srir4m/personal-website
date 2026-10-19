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

test("education card shows the school and coordinates", async ({ page }) => {
  await page.goto("/#globe");
  const card = page.locator(".edu-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Stevens Institute of Technology");
  await expect(card).toContainText("40.745°N 74.024°W");
});

test("course log opens from the keyboard, newest term first", async ({ page }) => {
  await page.goto("/#globe");
  const button = page.getByRole("button", { name: "Course log" });
  await expect(button).toBeVisible();
  for (let i = 0; i < 25 && !(await button.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const terms = page.locator(".course-log h4");
  await expect(terms.first()).toHaveText("2026 Fall");
  await expect(page.locator(".course-log .hud-tag")).toHaveCount(6);
  await expect(page.locator(".course-log")).toContainText("Theory of Computation");
});
