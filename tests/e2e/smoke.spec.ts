import { expect, test, type Page } from "@playwright/test";

const ACTS = ["boot", "globe", "descent", "squad", "becoming", "body", "outro"];

const activeAct = (page: Page) => page.locator("[data-active-act]").getAttribute("data-active-act");

test("renders all seven act sections with headings", async ({ page }) => {
  await page.goto("/");
  for (const id of ACTS) {
    await expect(page.locator(`section#act-${id} h2`)).toHaveCount(1);
  }
  expect(await activeAct(page)).toBe("boot");
});

test("scrolling moves through every act in order", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot-ready]")).toHaveAttribute("data-boot-ready", "true", { timeout: 5000 });
  const seen: string[] = [];
  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (let y = 0; y <= total; y += Math.round(total / 60)) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(30);
    const act = await activeAct(page);
    if (act && seen.at(-1) !== act) seen.push(act);
  }
  expect(seen).toEqual(ACTS);
});

for (const id of ACTS.slice(1)) {
  test(`deep link #${id} lands on that act`, async ({ page }) => {
    await page.goto(`/#${id}`);
    await expect.poll(() => activeAct(page)).toBe(id);
  });
}

test("deep link #body/<region> keeps the region in the URL", async ({ page }) => {
  await page.goto("/#body/heart");
  await expect.poll(() => activeAct(page)).toBe("body");
  await expect(page).toHaveURL(/#body\/heart$/);
});

test("progress rail ticks jump to their act", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Acts" }).getByRole("link", { name: "Squad" }).click();
  await expect.poll(() => activeAct(page)).toBe("squad");
  await expect(page).toHaveURL(/#squad$/);
});

test("motion toggle switches to calm mode and still reaches deep links", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("switch", { name: "Calm motion" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.evaluate(() => (window.location.hash = "becoming"));
  await expect.poll(() => activeAct(page)).toBe("becoming");
});

test("production build shows no TODO text, robots noindex, and the version", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator("footer")).toContainText(/v\d+\.\d+\.\d+/);
  for (const id of ACTS) {
    await page.goto(`/#${id === "boot" ? "" : id}`);
    await page.waitForTimeout(200);
    expect(await page.locator("body").innerText()).not.toMatch(/TODO/);
  }
});

test("content status overlay is stripped from production", async ({ page }) => {
  await page.goto("/?status=1");
  await expect(page.getByRole("complementary", { name: "Content status" })).toHaveCount(0);
});
