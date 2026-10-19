import { expect, test, type Page } from "@playwright/test";

// Act 2's slice of the master timeline (src/stage/acts.ts shares: 5, 15, 20 of 105).
const ACT2 = { start: 20 / 105, end: 40 / 105 };

async function scrollToProgress(page: Page, progress: number) {
  const y = await page.evaluate((p) => {
    const spacer = document.querySelector(".pin-spacer") as HTMLElement;
    const range = spacer.offsetHeight - window.innerHeight;
    return Math.round(spacer.offsetTop + p * range);
  }, progress);
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(60);
}

const segment = (page: Page) => page.locator("[data-segment]").getAttribute("data-segment").then(Number);
const plateRect = (page: Page, which: "outer" | "inner") =>
  page.evaluate((w) => {
    const imgs = document.querySelectorAll<HTMLImageElement>("#act-descent [data-plate]");
    const r = imgs[w === "outer" ? 0 : 1]!.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width };
  }, which);

test.beforeEach(async ({ page }) => {
  await page.goto("/#descent");
  await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", "descent");
});

test("keeps at most two plates mounted and the scale readout only shrinks", async ({ page }) => {
  let last = Infinity;
  for (let i = 0; i <= 40; i++) {
    await scrollToProgress(page, ACT2.start + ((ACT2.end - ACT2.start) * i) / 40.5);
    expect(await page.locator("#act-descent [data-plate]").count()).toBeLessThanOrEqual(2);
    const text = await page.locator("#act-descent .hud-readout").textContent();
    const denominator = Number(text!.replace(/[^0-9]/g, "").slice(1));
    expect(denominator).toBeLessThanOrEqual(last);
    last = denominator;
  }
});

test("rebasing is seamless: the inner plate becomes the outer plate in place", async ({ page }) => {
  const pin = await page.evaluate(() => {
    const spacer = document.querySelector(".pin-spacer") as HTMLElement;
    return { top: spacer.offsetTop, range: spacer.offsetHeight - window.innerHeight };
  });
  let lo = Math.round(pin.top + ACT2.start * pin.range);
  const hi0 = Math.round(pin.top + ACT2.end * pin.range) - 2;
  for (let boundary = 0; boundary < 4; boundary++) {
    // Bisect to the last scroll pixel of this segment.
    let hi = hi0;
    await page.evaluate((y) => window.scrollTo(0, y), lo);
    await page.waitForTimeout(40);
    const startSegment = await segment(page);
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      await page.evaluate((y) => window.scrollTo(0, y), mid);
      await page.waitForTimeout(30);
      if ((await segment(page)) === startSegment) lo = mid;
      else hi = mid;
    }
    await page.evaluate((y) => window.scrollTo(0, y), lo);
    await page.waitForTimeout(40);
    const before = await plateRect(page, "inner");
    await page.evaluate((y) => window.scrollTo(0, y), hi);
    await page.waitForTimeout(40);
    expect(await segment(page)).toBe(startSegment + 1);
    const after = await plateRect(page, "outer");
    // One scroll pixel apart, the plate may grow by well under 2%, but never jump.
    expect(Math.abs(after.width - before.width) / before.width).toBeLessThan(0.02);
    const centre = (r: { x: number; width: number }) => r.x + r.width / 2;
    expect(Math.abs(centre(after) - centre(before))).toBeLessThan(0.02 * before.width + 2);
    lo = hi;
    if (startSegment + 1 >= 3) break;
  }
});
