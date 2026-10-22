import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** The chapter layout: one column of chapters over the pixel scene (#8). */
const site = (page: Page) => page.locator(".chapter-site");

test("renders every chapter in one column, with the owner's name as the page's heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sriram");
  for (const id of ["home", "location", "campus", "about", "build", "play", "body", "contact"]) await expect(page.locator(`#chapter-${id}`)).toBeAttached();
  await expect(site(page)).not.toContainText("TODO");
  await expect(page.locator("#pixel-scene")).toBeAttached();
});

test("old act hashes land on their chapters", async ({ page }) => {
  for (const [hash, chapter] of [["descent", "campus"], ["becoming", "about"], ["outro", "contact"], ["activities", "play"]] as const) {
    await page.goto(`/#${hash}`);
    await expect(site(page)).toHaveAttribute("data-active-chapter", chapter);
  }
});

test("scrolling moves the reading position, the rail and the URL hash", async ({ page }) => {
  await page.goto("/");
  await expect(site(page)).toHaveAttribute("data-active-chapter", "home");
  await page.evaluate(() => {
    const box = document.getElementById("chapter-about")!.getBoundingClientRect();
    window.scrollBy({ top: box.top + Math.min(box.height, innerHeight) / 2 - innerHeight / 2, behavior: "instant" });
  });
  await expect(site(page)).toHaveAttribute("data-active-chapter", "about");
  await expect(page).toHaveURL(/#about$/);
  await expect(page.getByRole("navigation", { name: "Chapters" }).getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "step");
});

test("the rail scrolls to a chapter", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Chapters" }).getByRole("link", { name: "Contact" }).click();
  await expect(site(page)).toHaveAttribute("data-active-chapter", "contact");
});

test("#body/<region> opens that region's panel", async ({ page }) => {
  await page.goto("/#body/spine");
  const panel = page.getByRole("dialog", { name: "Backbone" });
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("the vault opens from the heart's chapter", async ({ page }) => {
  await page.goto("/#heart");
  // Click once the page has settled on the chapter, not while it is still scrolling there.
  await expect(site(page)).toHaveAttribute("data-active-chapter", "heart");
  await page.getByRole("button", { name: "Open the vault" }).click();
  await expect(page.getByRole("dialog", { name: "Heart" })).toBeVisible();
});

test("Calm mode snaps the page to chapters", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toContain("y");
});

for (const hash of ["", "#location", "#campus", "#about", "#build", "#play", "#body", "#contact"]) {
  test(`axe finds no violations at ${hash || "home"}`, async ({ page }) => {
    await page.goto(`/${hash}`);
    await expect(site(page)).toBeAttached();
    await page.waitForTimeout(500);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}
