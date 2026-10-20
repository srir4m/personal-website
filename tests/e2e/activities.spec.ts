import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#activities");
  await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", "activities");
});

test("lists activities as cards, with gaming last", async ({ page }) => {
  const cards = page.locator("#act-activities .activity-card");
  await expect(cards.first()).toBeVisible();
  await expect(cards.last()).toContainText("Gaming");
  await expect(page.locator("#act-activities")).toContainText("Swimming");
  await expect(page.locator("#act-activities")).not.toContainText("TODO");
});

test("a hobby card jumps to its body map region with the panel open", async ({ page }) => {
  await page.getByRole("button", { name: /Swimming/ }).click();
  await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", "body");
  const panel = page.getByRole("dialog", { name: "Legs" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Competitive swimmer for 10 years");
});

test("the gaming card opens the games, with their logos, ranks and the trademark note", async ({ page }) => {
  await page.getByRole("button", { name: /Gaming/ }).click();
  const panel = page.getByRole("dialog", { name: "Gaming" });
  await expect(panel).toBeVisible();
  await expect(panel.locator(".game-emblem")).toHaveCount(5);
  await expect(panel.getByRole("img", { name: "VALORANT" })).toBeVisible();
  await expect(panel).toContainText("17,000 Premier");
  await expect(panel).toContainText("Platinum");
  await expect(panel).toContainText("trademarks of their respective owners");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Gaming/ })).toBeFocused();
});
