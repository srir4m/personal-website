import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** The pixel scene (pixel move, issue #8, PR 3), previewed with ?pixel. */
const scene = (page: Page) => page.locator("#pixel-scene");

async function readChapter(page: Page, id: string) {
  await page.evaluate((id) => {
    const box = document.getElementById(`chapter-${id}`)!.getBoundingClientRect();
    window.scrollBy({ top: box.top + Math.min(box.height, innerHeight) / 2 - innerHeight / 2, behavior: "instant" });
  }, id);
  await expect(page.locator(".chapter-site")).toHaveAttribute("data-active-chapter", id);
}

/** The canvas pixel at a point, as "r,g,b". */
const pixelAt = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([x, y]) => {
      const c = document.querySelector<HTMLCanvasElement>("#pixel-scene canvas")!;
      const d = c.getContext("2d")!.getImageData(Math.floor(x! * c.width), Math.floor(y! * c.height), 1, 1).data;
      return `${d[0]},${d[1]},${d[2]}`;
    },
    [x, y],
  );

test("the scene zooms from the Earth to the area, the campus street and the figure as the chapters are read", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?pixel");
  await expect(scene(page)).toHaveAttribute("data-ready", "true");
  await expect(scene(page)).toHaveAttribute("data-scene", "globe");
  for (const [chapter, shown] of [["location", "city"], ["campus", "street"], ["about", "figure"], ["contact", "figure"]] as const) {
    await readChapter(page, chapter);
    await expect(scene(page)).toHaveAttribute("data-scene", shown);
  }
  // The map's credit shows while a map is on screen.
  await readChapter(page, "location");
  await expect(page.locator(".pixel-readout")).toContainText("OpenStreetMap");
  await readChapter(page, "about");
  await expect(page.locator(".pixel-readout")).not.toContainText("OpenStreetMap");
  expect(errors).toEqual([]);
});

test("the figure is drawn at full resolution while a chapter is read", async ({ page }) => {
  await page.goto("/?pixel");
  await expect(scene(page)).toHaveAttribute("data-ready", "true");
  await readChapter(page, "about");
  await expect.poll(() => page.locator("#pixel-scene canvas").evaluate((c: HTMLCanvasElement) => c.width)).toBe(320);
});

test.describe("dark mode", () => {
  test.use({ colorScheme: "dark" });
  test("the scene follows the system's dark setting, paper and ink swapped", async ({ page }) => {
    await page.goto("/?pixel");
    await expect(scene(page)).toHaveAttribute("data-ready", "true");
    // The globe's corner is the page's paper: the dark parchment.
    await expect.poll(() => pixelAt(page, 0.01, 0.01)).toBe("27,21,16");
  });
  test("has no accessibility violations in dark mode", async ({ page }) => {
    await page.goto("/?pixel");
    await expect(scene(page)).toHaveAttribute("data-ready", "true");
    await readChapter(page, "build");
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });
});
