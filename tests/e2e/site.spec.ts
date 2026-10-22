import { expect, test, type Page } from "@playwright/test";
import { CHAPTERS } from "../../src/stage/chapters";

/** The site as a whole: one column of chapters over the pixel scene (issue #8). */
const site = (page: Page) => page.locator(".chapter-site");
const MAJOR = ["", "location", "campus", "about", "build", "play", "body", "contact"];

async function readChapter(page: Page, id: string) {
  await page.evaluate((id) => {
    const box = document.getElementById(`chapter-${id}`)!.getBoundingClientRect();
    window.scrollBy({ top: box.top + Math.min(box.height, innerHeight) / 2 - innerHeight / 2, behavior: "instant" });
  }, id);
  await expect(site(page)).toHaveAttribute("data-active-chapter", id);
}

test("no white flash: the document is parchment before any script runs", async ({ page }) => {
  await page.route("**/*.js", (route) => new Promise((resolve) => setTimeout(() => resolve(route.continue()), 500)));
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector("body");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe("rgb(239, 228, 204)");
});

test("the hero is in the served HTML, so it paints before any JavaScript, and the page takes it over", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toMatch(/<div id="boot-title"[^>]*>.*Sriram/s);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Sriram");
  await expect(page.locator("#boot-title")).toHaveCount(0);
});

test("a deep link never shows the served hero", async ({ page }) => {
  await page.goto("/#about");
  await expect(page.locator("#boot-title")).toHaveCount(0);
  await expect(site(page)).toHaveAttribute("data-active-chapter", "about");
});

test("every chapter's link lands on it", async ({ page }) => {
  for (const chapter of CHAPTERS.filter((c) => c.hash)) {
    await page.goto(`/#${chapter.hash}`);
    await expect(site(page), `#${chapter.hash}`).toHaveAttribute("data-active-chapter", chapter.id);
  }
});

test("the old preview flag still loads the site", async ({ page }) => {
  await page.goto("/?pixel#about");
  await expect(site(page)).toHaveAttribute("data-active-chapter", "about");
});

test("production shows no TODO text, robots noindex, and the version; dev tools are stripped", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator("footer")).toContainText(/v\d+\.\d+\.\d+/);
  expect(await page.locator("body").innerText()).not.toMatch(/TODO|Open to junior-year internships/);
  await page.goto("/?status=1");
  await expect(page.getByRole("complementary", { name: "Content status" })).toHaveCount(0);
  await page.goto("/?edit=regions");
  await expect(page.getByRole("heading", { name: "Region editor" })).toHaveCount(0);
  await expect(site(page)).toBeAttached();
});

test.describe("motion", () => {
  test("Calm is the default when the system asks for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  });

  test("the Motion toggle overrides the system both ways, and Calm still reaches deep links", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("switch", { name: "Calm motion" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
    await page.evaluate(() => (window.location.hash = "campus"));
    await expect(site(page)).toHaveAttribute("data-active-chapter", "campus");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  });
});

test("the tour's chapters show the work, with live links, and the games with their logos and the trademark note", async ({ page }) => {
  await page.goto("/#build");
  const build = page.locator("#chapter-build");
  await expect(build.getByRole("link", { name: /Sponge/ })).toHaveAttribute("href", "https://getsponge.ai");
  await expect(build.getByRole("link", { name: /Sponge/ })).toHaveAttribute("rel", /noopener/);
  await expect(page.locator("#chapter-spine")).toContainText("B.S. Computer Science");
  const play = page.locator("#chapter-play");
  await expect(play.getByRole("img", { name: "VALORANT" })).toBeVisible();
  await expect(play).toContainText("17,000 Premier");
  await expect(play).toContainText("trademarks of their respective owners");
});

test("Back to top returns to the start", async ({ page }) => {
  await page.goto("/#contact");
  await page.getByRole("button", { name: /Back to top/ }).click();
  await expect(site(page)).toHaveAttribute("data-active-chapter", "home", { timeout: 5000 });
});

test("no request leaves the site: fonts, images and code are self-hosted", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname) && !["data:", "blob:"].includes(url.protocol)) external.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("#pixel-scene")).toHaveAttribute("data-ready", "true");
  for (const id of ["location", "campus", "play", "body"]) await readChapter(page, id);
  expect(external).toEqual([]);
});

test.describe("layout", () => {
  test.skip(({ isMobile }) => isMobile, "sizes are set explicitly; one project is enough");
  // The smallest phones, short phones, a tablet, laptops and a wide screen.
  for (const [width, height] of [[320, 568], [360, 640], [375, 667], [768, 1024], [1024, 768], [1280, 720], [1920, 1080]] as const) {
    test(`no chapter scrolls the page sideways at ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      for (const id of MAJOR.filter(Boolean)) {
        await readChapter(page, id);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `#${id}`).toBeLessThanOrEqual(0);
      }
    });
  }
});

test("layout stays stable while loading and scrolling (CLS < 0.05)", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await expect(page.locator("#pixel-scene")).toHaveAttribute("data-ready", "true");
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let i = 1; i <= 20; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), (total * i) / 20);
    await page.waitForTimeout(50);
  }
  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.05);
});

test("largest contentful paint lands quickly on a local load", async ({ page }) => {
  await page.goto("/");
  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => resolve(list.getEntries().at(-1)!.startTime)).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve(-1), 4000);
      }),
  );
  expect(lcp).toBeGreaterThan(0);
  expect(lcp).toBeLessThan(2500);
});
