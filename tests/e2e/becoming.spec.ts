import { expect, test } from "@playwright/test";
import geometry from "../../src/content/vitruvian.json" with { type: "json" };

test("the globe's circle lands exactly on the Vitruvian circle, in coastline ink", async ({ page }) => {
  await page.goto("/#becoming");
  await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", "becoming");
  await page.waitForTimeout(600);
  const { stage, circle, style } = await page.evaluate(() => {
    const svg = document.querySelector("#act-becoming .vitruvian-stage")!;
    const ring = document.querySelector("#act-becoming [data-testid=vitruvian-circle]")!;
    const s = svg.getBoundingClientRect();
    const c = ring.getBoundingClientRect();
    const cs = getComputedStyle(ring);
    return {
      stage: { x: s.x, y: s.y, w: s.width, h: s.height },
      circle: { x: c.x, y: c.y, w: c.width, h: c.height },
      style: { stroke: cs.stroke, width: cs.strokeWidth },
    };
  });
  // The SVG letterboxes its viewBox (preserveAspectRatio "xMidYMid meet").
  const vbW = geometry.viewBox[2]!;
  const vbH = geometry.viewBox[3]!;
  const k = Math.min(stage.w / vbW, stage.h / vbH);
  const offX = (stage.w - vbW * k) / 2;
  const offY = (stage.h - vbH * k) / 2;
  const expected = {
    x: stage.x + offX + (geometry.circle.cx - geometry.circle.r) * k,
    y: stage.y + offY + (geometry.circle.cy - geometry.circle.r) * k,
    d: 2 * geometry.circle.r * k,
  };
  expect(Math.abs(circle.x - expected.x)).toBeLessThan(1.5);
  expect(Math.abs(circle.y - expected.y)).toBeLessThan(1.5);
  expect(Math.abs(circle.w - expected.d)).toBeLessThan(1.5);
  expect(Math.abs(circle.h - expected.d)).toBeLessThan(1.5);
  // Same ink and weight as the globe coastlines.
  expect(style.stroke).toBe("rgb(43, 33, 24)");
  expect(style.width).toBe("1.25px");
});

test("at the settled frame the figure has inked in and the map's ring has become the circle", async ({ page }) => {
  await page.goto("/#becoming");
  await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", "becoming");
  await page.waitForTimeout(600);
  const state = await page.evaluate(() => ({
    bleedIn: document.querySelector("#act-becoming .bleed-in-threshold")!.getAttribute("intercept"),
    mask: document.querySelector("#act-becoming .becoming-figure")!.getAttribute("mask"),
    chalk: getComputedStyle(document.querySelector("#act-becoming .becoming-ring-chalk")!).opacity,
  }));
  expect(Number(state.bleedIn)).toBeGreaterThan(0.9);
  expect(state.mask).toBe("none");
  expect(Number(state.chalk)).toBe(0);
});

test("Becoming opens on the map's ring: centred on screen, just outside the circle's size", async ({ page }) => {
  await page.goto("/#descent");
  await expect(page.locator(".descent-map")).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
  // Scroll to the very start of Becoming, where it has dissolved in over the map.
  const { start } = await import("../../src/stage/acts").then((m) => m.rangeOf("becoming"));
  await page.evaluate((p) => window.scrollTo(0, Math.round(p * 14 * innerHeight)), start + 0.0005);
  await page.waitForTimeout(800);
  const ring = await page.locator("#act-becoming .becoming-ring-chalk").boundingBox();
  const size = page.viewportSize()!;
  expect(Math.abs(ring!.x + ring!.width / 2 - size.width / 2)).toBeLessThan(3);
  expect(Math.abs(ring!.y + ring!.height / 2 - size.height / 2)).toBeLessThan(3);
  const circle = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;width:var(--figure-size)";
    document.body.appendChild(probe);
    const px = probe.offsetWidth;
    probe.remove();
    return px;
  });
  expect(ring!.width / circle).toBeGreaterThan(1);
});

test("the region editor is not in production builds", async ({ page }) => {
  await page.goto("/?edit=regions");
  await expect(page.getByRole("heading", { name: "Region editor" })).toHaveCount(0);
  await expect(page.locator("[data-active-act]")).toBeVisible();
});
