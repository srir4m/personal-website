import { expect, test } from "@playwright/test";

test.describe("without WebGL", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
        return (original as (...args: unknown[]) => RenderingContext | null).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
  });

  test("shows a static SVG globe with the marker and the area card", async ({ page }) => {
    await page.goto("/#globe");
    await expect(page.locator("#act-globe canvas")).toHaveCount(0);
    await expect(page.locator("#act-globe svg.globe-circle")).toBeVisible();
    const dot = page.locator("#act-globe .marker-area");
    await expect(dot).toBeVisible();
    // The fallback globe faces the owner's area, so the marker sits at its centre.
    const [d, g] = await Promise.all([dot.boundingBox(), page.locator("#act-globe svg.globe-circle").boundingBox()]);
    expect(Math.abs(d!.x + d!.width / 2 - (g!.x + g!.width / 2))).toBeLessThan(2);
    expect(Math.abs(d!.y + d!.height / 2 - (g!.y + g!.height / 2))).toBeLessThan(2);
    await expect(page.locator(".globe-card")).toContainText("New York area");
  });

  test("still lets the visitor scroll past the boot screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-boot-ready]")).toHaveAttribute("data-boot-ready", "true", { timeout: 5000 });
  });
});

test.describe("without WebGL, the descent", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
        return (original as (...args: unknown[]) => RenderingContext | null).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
  });

  test("names the area instead of drawing a map", async ({ page }) => {
    await page.goto("/#descent");
    await expect(page.locator("#act-descent .descent-map")).toHaveCount(0);
    await expect(page.locator("#act-descent")).toContainText("New York area");
  });
});
