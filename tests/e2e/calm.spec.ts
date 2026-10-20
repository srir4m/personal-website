import { expect, test } from "@playwright/test";
import { rangeOf } from "../../src/stage/acts";

const GLOBE = rangeOf("globe");

test.describe("Calm mode (prefers-reduced-motion)", () => {
  test.use({ reducedMotion: "reduce" });

  test("defaults to Calm when the OS asks for reduced motion", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
    await expect(page.getByRole("switch", { name: "Calm motion" })).toHaveAttribute("aria-checked", "true");
  });

  test("snaps to each act's settled frame instead of scrubbing", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-boot-ready]")).toHaveAttribute("data-boot-ready", "true");
    // Scroll a little way into the globe act: the timeline settles on the act's frame.
    const y = await page.evaluate((at) => {
      const spacer = document.querySelector(".pin-spacer") as HTMLElement;
      return spacer.offsetTop + (spacer.offsetHeight - innerHeight) * at;
    }, GLOBE.start + (GLOBE.end - GLOBE.start) * 0.2);
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", "globe");
    // The area card only shows from the middle of the act, so seeing it proves the settle.
    await expect(page.locator(".globe-card")).toBeVisible();
  });

  test("the outro shows its settled frame at once", async ({ page }) => {
    await page.goto("/#outro");
    await expect(page.getByRole("button", { name: /Back to top/ })).toBeVisible({ timeout: 1500 });
  });

  test("the globe stands still", async ({ page }) => {
    await page.goto("/#globe");
    const canvas = page.locator("#act-globe canvas");
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(500);
    const first = await canvas.screenshot();
    await page.waitForTimeout(1200);
    const second = await canvas.screenshot();
    expect(first.equals(second)).toBe(true);
  });
});

test("the Motion toggle overrides the OS setting both ways", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("switch", { name: "Calm motion" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
});
