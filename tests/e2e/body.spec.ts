import { expect, test, type Page } from "@playwright/test";

/** The body map: the figure's regions, each opening a panel (issue #8, PR 4). */
const chips = (page: Page) => page.locator("#chapter-body .chapter-regions button");
const panel = (page: Page, name: string) => page.getByRole("dialog", { name });
const chip = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^${name} ·`) });

async function openRegion(page: Page, name: string) {
  await chip(page, name).focus();
  await page.keyboard.press("Enter");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#body");
  await expect(page.locator(".chapter-site")).toHaveAttribute("data-active-chapter", "body");
});

test("regions are named and in the PRD's order; dormant ones are left out", async ({ page }) => {
  const names = await chips(page).evaluateAll((els) => els.map((el) => el.textContent!.trim()));
  expect(names).toEqual([
    "Mind · What I build and play",
    "Ears · What I hear and compose",
    "Heart · The vault",
    "Chest · Strength",
    "Backbone · Highlights and credentials",
    "Arms · Grapple and climb",
    "Stomach · Fuel",
    "Legs · Endurance",
  ]);
  // Keyboard order follows the list.
  await chips(page).first().focus();
  for (const expected of ["Ears", "Heart", "Chest"]) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.textContent)).toMatch(new RegExp(`^${expected}`));
  }
});

test("Enter opens a region's panel; Esc closes it and returns focus", async ({ page }) => {
  await openRegion(page, "Mind");
  const dialog = panel(page, "Mind");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Sponge" })).toBeVisible();
  const link = dialog.getByRole("link", { name: /getsponge\.ai/ });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(page).toHaveURL(/#body\/head$/);
  // Focus is trapped in the open panel.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]")))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(chip(page, "Mind")).toBeFocused();
});

test("a click outside the panel closes it", async ({ page }) => {
  await openRegion(page, "Chest");
  await expect(panel(page, "Chest")).toBeVisible();
  await page.mouse.click(20, 200);
  await expect(panel(page, "Chest")).toBeHidden();
});

test("#body/<regionId> opens that panel on load", async ({ page }) => {
  await page.goto("/#body/ears");
  await expect(panel(page, "Ears")).toBeVisible();
  await expect(panel(page, "Ears")).toContainText("Darien Young Composers");
});

test("the course log lives in the Backbone panel, newest term first", async ({ page }) => {
  await openRegion(page, "Backbone");
  const dialog = panel(page, "Backbone");
  await expect(dialog).toContainText("B.S. Computer Science");
  const button = dialog.getByRole("button", { name: "Course log" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(dialog.locator(".course-log h4").first()).toHaveText("2026 Fall");
  await expect(dialog.locator(".course-log")).toContainText("Systems Programming");
});

test("no TODO or draft text reaches any panel", async ({ page }) => {
  for (const name of ["Mind", "Backbone", "Stomach"]) {
    await openRegion(page, name);
    const dialog = panel(page, name);
    await expect(dialog).toBeVisible();
    await expect(dialog).not.toContainText(/TODO|Open to junior-year internships/);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
});
