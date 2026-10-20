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
  for (const t of [0.05, 0.3, 0.55, 0.78]) {
    await scrollToDescent(page, t);
    await expect.poll(() => zoom(page)).toBeGreaterThan(last);
    last = await zoom(page);
  }
  // It reaches street level, among the buildings.
  expect(last).toBeGreaterThan(16);
  await expect(page.locator(".map-attribution")).toContainText("OpenStreetMap");
});

test("the descent settles low among the 3D buildings, and ends looking straight down", async ({ page }) => {
  await page.goto("/#descent");
  const map = page.locator(".descent-map");
  await expect(map).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
  await expect.poll(async () => Number(await map.getAttribute("data-pitch"))).toBeGreaterThan(50);
  // The building at the street address is found in the tiles, to be raised in red chalk.
  await expect(map).toHaveAttribute("data-street-building", "found", { timeout: 15_000 });
  await scrollToDescent(page, 0.999);
  await expect(map).toHaveAttribute("data-pitch", "0");
});

test("the descent rings the owner's area at metro scale", async ({ page }) => {
  await page.goto("/#descent");
  await expect(page.locator(".descent-map")).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
  await scrollToDescent(page, 0.31);
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
