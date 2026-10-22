import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** The pixel scene, the companion, the typed hero and the body map (issue #8). */
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
  await page.goto("/");
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
  await page.goto("/");
  await expect(scene(page)).toHaveAttribute("data-ready", "true");
  await readChapter(page, "about");
  await expect.poll(() => page.locator("#pixel-scene canvas").evaluate((c: HTMLCanvasElement) => c.width)).toBe(320);
});

test.describe("dark mode", () => {
  test.use({ colorScheme: "dark" });
  test("the scene follows the system's dark setting, paper and ink swapped", async ({ page }) => {
    await page.goto("/");
    await expect(scene(page)).toHaveAttribute("data-ready", "true");
    // The globe's corner is the page's paper: the dark parchment.
    await expect.poll(() => pixelAt(page, 0.01, 0.01)).toBe("27,21,16");
  });
  test("has no accessibility violations in dark mode", async ({ page }) => {
    await page.goto("/");
    await expect(scene(page)).toHaveAttribute("data-ready", "true");
    await readChapter(page, "build");
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });
});

test.describe("motion", () => {
  test("the name and tagline are whole for screen readers, and the tagline types itself in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Sriram");
    const tagline = page.locator(".hero-tagline");
    await expect(tagline.locator(".sr-only")).toHaveText("Architecting perfection");
    await expect(tagline).toHaveAttribute("data-typing", "false", { timeout: 5000 });
  });

  test("the companion flaps while scrolling and perches by the Contact title", async ({ page }) => {
    await page.goto("/");
    const companion = page.locator(".companion");
    await expect(companion).toHaveAttribute("data-pose", "mid");
    const poses = new Set<string>();
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(40);
      poses.add((await companion.getAttribute("data-pose")) ?? "");
    }
    expect(poses.size).toBeGreaterThan(1);
    // Let the smooth scroll's momentum settle before jumping, as a reader's next scroll would.
    await page.waitForTimeout(1000);
    await readChapter(page, "contact");
    await expect(companion).toHaveAttribute("data-perched", "true");
    await expect(companion).toHaveAttribute("data-pose", "folded");
  });
});

test.describe("calm", () => {
  test.use({ reducedMotion: "reduce" });
  test("reduced motion types nothing and keeps the companion still", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero-tagline")).toHaveAttribute("data-typing", "false");
    await expect(page.locator(".hero-letter").first()).toHaveCSS("animation-name", "none");
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(100);
    await expect(page.locator(".companion")).toHaveAttribute("data-pose", "mid");
    expect(await page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(false);
  });
});

test.describe("body map", () => {
  test("the figure's regions open their panels, and pointing at one hatches it", async ({ page, isMobile }) => {
    await page.goto("/#body");
    await expect(page.locator(".chapter-site")).toHaveAttribute("data-active-chapter", "body");
    const hotspots = page.locator(isMobile ? ".body-plate__hotspots" : ".body-hotspots");
    const chest = hotspots.locator("[data-region=chest] polygon").first();
    await expect(chest).toBeVisible();
    const box = (await chest.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    // Pointing hatches the region: the figure gains red pixels.
    const reds = () =>
      page.evaluate((selector) => {
        const c = document.querySelector<HTMLCanvasElement>(selector)!;
        const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i]! > 150 && d[i + 1]! < 90) n++;
        return n;
      }, isMobile ? ".body-plate canvas" : "#pixel-scene canvas");
    await expect.poll(reds).toBeGreaterThan(20);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByRole("dialog")).toContainText("Chest");
  });

  test("the hotspots are live only in the body chapter", async ({ page, isMobile }) => {
    test.skip(isMobile, "phones use the plate inside the chapter");
    await page.goto("/#about");
    await expect(page.locator(".body-hotspots")).toBeHidden();
  });
});
