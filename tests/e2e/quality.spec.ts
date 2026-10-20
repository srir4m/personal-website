import { expect, test } from "@playwright/test";

const ACTS = ["", "about", "globe", "descent", "activities", "becoming", "body", "outro"];

test("no act scrolls the page sideways", async ({ page }) => {
  for (const act of ACTS) {
    await page.goto(act ? `/#${act}` : "/");
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `#${act || "boot"}`).toBeLessThanOrEqual(0);
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
  await expect(page.locator("[data-boot-ready]")).toHaveAttribute("data-boot-ready", "true", { timeout: 5000 });
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let i = 1; i <= 20; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), (total * i) / 20);
    await page.waitForTimeout(50);
  }
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThan(0.05);
});

test("largest contentful paint lands quickly on a local load", async ({ page }) => {
  await page.goto("/");
  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => resolve(list.getEntries().at(-1)!.startTime)).observe({
          type: "largest-contentful-paint",
          buffered: true,
        });
        setTimeout(() => resolve(-1), 4000);
      }),
  );
  // Locally this is far under the 2.5 s cable budget (PRD §10.3); it guards against regressions.
  expect(lcp).toBeGreaterThan(0);
  expect(lcp).toBeLessThan(2500);
});

test("the outro plays its montage and Back to top returns to the start", async ({ page }) => {
  await page.goto("/#outro");
  const back = page.getByRole("button", { name: /Back to top/ });
  await expect(back).toBeVisible({ timeout: 4000 });
  await back.click();
  await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", "boot", { timeout: 5000 });
});

test("the title is in the served HTML, so it paints before any JavaScript, and Act 0 takes it over", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toMatch(/<div id="boot-title"[^>]*>.*Sriram/s);
  await page.goto("/");
  await expect(page.locator("#act-boot")).toContainText("Sriram");
  await expect(page.locator("#boot-title")).toHaveCount(0);
});

test("a deep link never shows the opening title", async ({ page }) => {
  await page.goto("/#about");
  await expect(page.locator("#boot-title")).toHaveCount(0);
});
