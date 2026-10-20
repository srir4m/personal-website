import { expect, test, type Page } from "@playwright/test";
import { rangeOf } from "../../src/stage/acts";

const DESCENT = rangeOf("descent");

async function scrollToDescent(page: Page, t: number) {
  await page.evaluate((p) => {
    const spacer = document.querySelector(".pin-spacer") as HTMLElement;
    window.scrollTo(0, spacer.offsetTop + p * (spacer.offsetHeight - innerHeight));
  }, DESCENT.start + t * (DESCENT.end - DESCENT.start));
}

const zoom = (page: Page) => page.locator(".descent-map").getAttribute("data-zoom").then(Number);

test("the map loads from self-hosted tiles and zooms in as the page scrolls", async ({ page }) => {
  await page.goto("/#descent");
  await expect(page.locator(".descent-map")).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
  let last = -Infinity;
  for (const t of [0.05, 0.3, 0.6, 0.9]) {
    await scrollToDescent(page, t);
    await expect.poll(() => zoom(page)).toBeGreaterThan(last);
    last = await zoom(page);
  }
  // It ends at metro scale, with the area's ring on screen for Becoming to take over.
  expect(last).toBeGreaterThan(8);
  await expect(page.locator(".map-attribution")).toContainText("OpenStreetMap");
});

test("the settled descent highlights the owner's area", async ({ page }) => {
  await page.goto("/#descent");
  await expect(page.locator(".descent-map")).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
  const label = page.locator(".area-pin");
  await expect(label).toContainText("New York area");
  await expect.poll(async () => Number(await label.evaluate((el) => (el as HTMLElement).style.opacity))).toBeGreaterThan(0.9);
});

test("no request leaves the site: fonts, tiles, and code are all self-hosted", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname) && !["data:", "blob:"].includes(url.protocol)) external.push(request.url());
  });
  await page.goto("/#descent");
  await expect(page.locator(".descent-map")).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
  for (const t of [0.2, 0.6, 0.95]) {
    await scrollToDescent(page, t);
    await page.waitForTimeout(800);
  }
  await page.goto("/#body");
  await page.waitForTimeout(800);
  expect(external).toEqual([]);
});
