import { expect, test, type Page } from "@playwright/test";
import { REST_POINTS, SCROLL_VIEWPORTS, actIndex } from "../../src/stage/acts";
import { TOUR_STOPS } from "../../src/stage/tour";

const TOUR = actIndex("tour");
const STOPS = REST_POINTS.filter((p) => p.act === TOUR);

/** Scrolls to a tour stop's settled point and waits for its text to read in. */
async function goToStop(page: Page, id: string) {
  const i = TOUR_STOPS.findIndex((s) => s.id === id);
  expect(i, id).toBeGreaterThan(-1);
  await page.evaluate(({ at, vps }) => window.scrollTo(0, Math.round(at * vps * window.innerHeight)), { at: STOPS[i]!.at, vps: SCROLL_VIEWPORTS });
  const stop = page.locator(`#act-tour [data-stop="${id}"]`);
  await expect.poll(async () => Number(await stop.evaluate((el) => (el as HTMLElement).style.opacity))).toBeGreaterThan(0.95);
  return stop;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#profile");
  await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", "tour");
});

test("every tour stop has its own rest point", () => {
  expect(STOPS).toHaveLength(TOUR_STOPS.length);
});

test("the tour shows the work on screen, with live links", async ({ page }) => {
  const build = await goToStop(page, TOUR_STOPS.find((s) => s.id.startsWith("build"))!.id);
  await expect(build.getByRole("link", { name: /Sponge/ })).toHaveAttribute("href", "https://getsponge.ai");
  const spine = await goToStop(page, TOUR_STOPS.find((s) => s.id.startsWith("spine"))!.id);
  await expect(spine).toContainText("B.S. Computer Science");
  await expect(page.locator("#act-tour")).not.toContainText("TODO");
});

test("only the visible stop can be reached by keyboard and screen readers", async ({ page }) => {
  await goToStop(page, "intro");
  const inert = await page.locator("#act-tour .tour-stop").evaluateAll((els) => els.map((el) => (el as HTMLElement).inert));
  expect(inert.filter((x) => !x)).toHaveLength(1);
});

test("the play stop shows the games with their logos, ranks and the trademark note", async ({ page }) => {
  const play = await goToStop(page, "play");
  await expect(play.locator(".game-emblem")).toHaveCount(5);
  await expect(play.getByRole("img", { name: "VALORANT" })).toBeVisible();
  await expect(play).toContainText("17,000 Premier");
  await expect(play).toContainText("Platinum");
  await expect(play).toContainText("trademarks of their respective owners");
});

test("the heart stop opens the vault", async ({ page }) => {
  const heart = await goToStop(page, "heart");
  await heart.getByRole("button", { name: "Open the vault" }).click();
  await expect(page.getByRole("dialog", { name: "Heart" })).toBeVisible();
});

test.describe("calm mode", () => {
  test.use({ reducedMotion: "reduce" });
  test("snaps to each stop instead of scrubbing past it", async ({ page }) => {
    // Scroll to just inside the third stop's segment: Calm mode settles there, text fully in.
    const third = STOPS[2]!;
    await page.evaluate(({ from, vps }) => window.scrollTo(0, Math.round((from + 0.001) * vps * window.innerHeight)), { from: third.from, vps: SCROLL_VIEWPORTS });
    const stop = page.locator(`#act-tour [data-stop="${TOUR_STOPS[2]!.id}"]`);
    await expect.poll(async () => Number(await stop.evaluate((el) => (el as HTMLElement).style.opacity))).toBe(1);
  });
});

test.describe("every stop fits one screen", () => {
  test.skip(({ isMobile }) => isMobile, "sizes are set explicitly; one project is enough");
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [1024, 768],
    [1280, 720],
  ]) {
    test(`at ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width: width!, height: height! });
      // The stage re-measures its scroll length after a resize (debounced in timeline.ts).
      await page.waitForTimeout(600);
      for (const stop of TOUR_STOPS) {
        const el = await goToStop(page, stop.id);
        const off = await el.evaluate((article) => {
          const out: string[] = [];
          for (const node of article.querySelectorAll("p, li, a, button, h3")) {
            const r = node.getBoundingClientRect();
            if (r.height && (r.top < -1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > innerWidth + 1))
              out.push(node.textContent!.trim().slice(0, 30));
          }
          return out;
        });
        expect(off, stop.id).toEqual([]);
      }
    });
  }
});
