import { expect, test } from "@playwright/test";

test("the page title and social preview come from the content file", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Sriram · Architecting perfection");
  const meta = (selector: string) => page.locator(`head meta[${selector}]`).getAttribute("content");
  expect(await meta('name="description"')).toMatch(/^I am Sriram, a computer science student/);
  expect(await meta('property="og:title"')).toBe("Sriram · Architecting perfection");
  expect(await meta('property="og:image"')).toMatch(/\/og\.png$/);
  expect((await request.get("og.png")).ok()).toBe(true);
  expect((await request.get("apple-touch-icon.png")).ok()).toBe(true);
});

test("the not-found page matches the site and links back to the start", async ({ page }) => {
  await page.goto("/404.html");
  await expect(page).toHaveTitle("Not found · Sriram");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page is not on the map.");
  await page.getByRole("link", { name: "Back to the start" }).click();
  await expect(page.locator("[data-active-act]")).toBeVisible();
});
