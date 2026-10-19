import { expect, test, type Page } from "@playwright/test";

const regions = (page: Page) => page.locator("#act-body .region[role=button]");
const panel = (page: Page, name: string) => page.getByRole("dialog", { name });

/**
 * Opens a region from the keyboard. Regions overlap (the heart sits inside the chest, the
 * ears either side of the head), so clicking a region's bounding-box centre can hit another.
 */
async function openRegion(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).focus();
  await page.keyboard.press("Enter");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#body");
  await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", "body");
});

test("regions are named and in the PRD's tab order; dormant ones are skipped", async ({ page }) => {
  await expect(regions(page)).toHaveCount(8);
  const names = await regions(page).evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  expect(names).toEqual([
    "Mind: What I build and play",
    "Ears: What I hear and compose",
    "Heart: The vault",
    "Chest: Strength",
    "Backbone: Highlights and credentials",
    "Arms: Grapple and climb",
    "Stomach: Fuel",
    "Legs: Endurance",
  ]);
  const feet = page.locator('#act-body [data-region="feet"]');
  await expect(feet).toHaveAttribute("data-dormant", "true");
  await expect(feet).not.toHaveAttribute("tabindex");

  // Keyboard order follows DOM order.
  await regions(page).first().focus();
  for (const expected of ["Ears", "Heart", "Chest"]) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toMatch(new RegExp(`^${expected}`));
  }
});

test("Enter opens a region's panel; Esc closes it and returns focus", async ({ page }) => {
  const mind = page.getByRole("button", { name: /^Mind/ });
  await mind.focus();
  await page.keyboard.press("Enter");
  const dialog = panel(page, "Mind");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Sponge" })).toBeVisible();
  const link = dialog.getByRole("link", { name: /getsponge\.ai/ });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener");
  await expect(page).toHaveURL(/#body\/head$/);

  // Focus is trapped in the open panel.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]")))).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(mind).toBeFocused();
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

test("the pose toggle switches items and dims the other pose", async ({ page }) => {
  const reaching = page.getByRole("radio", { name: "Reaching" });
  await reaching.check({ force: true });
  await expect(page.locator("#act-body .body-figure")).toHaveAttribute("data-pose", "reaching");
  // Head has only a draft reaching item, so it goes dormant in production.
  await expect(page.locator('#act-body [data-region="head"]')).toHaveAttribute("data-dormant", "true");
  await openRegion(page, "Ears");
  const ears = panel(page, "Ears");
  await expect(ears).toContainText("Guitar");
  await expect(ears).not.toContainText("Darien Young Composers");
});

test("the heart opens the vault, even though it sits inside the chest", async ({ page }) => {
  const heart = page.locator("#act-body .region--hit polygon").first();
  await heart.click();
  await expect(panel(page, "Heart")).toBeVisible();
  await expect(panel(page, "Heart")).toContainText(/Passphrase|The vault is empty/);
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
