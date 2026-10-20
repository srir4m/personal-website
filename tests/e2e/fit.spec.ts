import { expect, test } from "@playwright/test";

const ACTS = ["", "about", "activities", "body", "outro"];
// The smallest phones (short and narrow), short phones, a tablet, a small laptop.
const SIZES = [
  [320, 568],
  [320, 720],
  [360, 640],
  [375, 667],
  [768, 1024],
  [1024, 768],
];

test.describe("every act fits one screen", () => {
  test.skip(({ isMobile }) => isMobile, "sizes are set explicitly; one project is enough");
  for (const [width, height] of SIZES) {
    test(`at ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width: width!, height: height! });
      for (const act of ACTS) {
        await page.goto(act ? `/#${act}` : "/");
        await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", act || "boot");
        await page.waitForTimeout(act === "outro" ? 2600 : 500);
        const offscreen = await page.evaluate(() => {
          const section = document.querySelector("section:not([inert])")!;
          const out: string[] = [];
          for (const el of section.querySelectorAll("p, li, button, a")) {
            if (el.closest(".sr-only")) continue;
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
            if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1)
              out.push(`${el.tagName} "${el.textContent!.trim().slice(0, 30)}"`);
          }
          return out;
        });
        expect(offscreen, `#${act || "boot"}`).toEqual([]);
      }
    });
  }
});
