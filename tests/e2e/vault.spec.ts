import { expect, test, type Page } from "@playwright/test";

// The e2e build uses tests/fixtures/vault.enc.json, never the real vault (PRD §9).
const TEST_PASSPHRASE = "test-passphrase-not-real";

const panel = (page: Page) => page.getByRole("dialog", { name: "Heart" });
const field = (page: Page) => panel(page).getByLabel("Passphrase");

test("#body/heart opens the vault panel on load", async ({ page }) => {
  await page.goto("/#body/heart");
  await expect(panel(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
});

test("the right passphrase cracks the seal and renders sanitised markdown", async ({ page }) => {
  await page.goto("/#body/heart");
  await field(page).fill(TEST_PASSPHRASE);
  await panel(page).getByRole("button", { name: "Break the seal" }).click();
  const content = page.getByTestId("vault-content");
  await expect(content).toBeVisible({ timeout: 10_000 });
  await expect(content.getByRole("heading", { name: "Fixture vault" })).toBeVisible();
  await expect(content.locator("li")).toHaveCount(2);
  // DOMPurify strips the script and the onerror handler planted in the fixture.
  await expect(content.locator("script")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __vaultXss?: boolean }).__vaultXss)).toBeUndefined();
  // Nothing persists.
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test("a wrong passphrase shakes, blots, and locks after five tries", async ({ page }) => {
  await page.goto("/#body/heart");
  for (let attempt = 1; attempt <= 5; attempt++) {
    await field(page).fill(`wrong passphrase number ${attempt}`);
    await field(page).press("Enter");
    if (attempt < 5) await expect(panel(page).getByRole("status")).toHaveText("The seal holds. Try again.", { timeout: 10_000 });
  }
  await expect(panel(page).getByTestId("ink-blot")).toBeVisible();
  await expect(panel(page).getByRole("status")).toContainText("Wait thirty seconds", { timeout: 10_000 });
  await expect(field(page)).toBeDisabled();
});

test("closing clears the vault and returns focus to the heart", async ({ page }) => {
  await page.goto("/#body");
  const heart = page.getByRole("button", { name: "Heart: the vault" });
  await heart.click();
  await field(page).fill(TEST_PASSPHRASE);
  await field(page).press("Enter");
  await expect(page.getByTestId("vault-content")).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(heart).toBeFocused();
  await expect(page.getByTestId("vault-content")).toHaveCount(0);
  await heart.click();
  await expect(field(page)).toBeVisible();
  await expect(page.getByTestId("vault-content")).toHaveCount(0);
});
