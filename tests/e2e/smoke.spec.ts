import { expect, test, type Page } from "@playwright/test";

const ACTS = ["boot", "globe", "descent", "becoming", "tour", "body", "outro"];
/** Each act's URL hash (the tour is #profile). */
const HASH: Record<string, string> = { boot: "", tour: "profile" };
const hashOf = (id: string) => HASH[id] ?? id;

const activeAct = (page: Page) => page.locator("[data-active-act]").getAttribute("data-active-act");

test("renders every act section with a heading", async ({ page }) => {
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
  test(`deep link #${hashOf(id)} lands on that act`, async ({ page }) => {
    await page.goto(`/#${hashOf(id)}`);
    await expect.poll(() => activeAct(page)).toBe(id);
  });
}

for (const old of ["about", "activities"]) {
  test(`the old #${old} link lands on the tour, which absorbed it`, async ({ page }) => {
    await page.goto(`/#${old}`);
    await expect.poll(() => activeAct(page)).toBe("tour");
  });
}

test("deep link #body/<region> keeps the region in the URL", async ({ page }) => {
  await page.goto("/#body/heart");
  await expect.poll(() => activeAct(page)).toBe("body");
  await expect(page).toHaveURL(/#body\/heart$/);
});

test("progress rail ticks jump to their act", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Acts" }).getByRole("link", { name: "Profile" }).click();
  await expect.poll(() => activeAct(page)).toBe("tour");
  await expect(page).toHaveURL(/#profile$/);
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
    await page.goto(`/#${hashOf(id)}`);
    await page.waitForTimeout(200);
    expect(await page.locator("body").innerText()).not.toMatch(/TODO/);
  }
});

test("content status overlay is stripped from production", async ({ page }) => {
  await page.goto("/?status=1");
  await expect(page.getByRole("complementary", { name: "Content status" })).toHaveCount(0);
});

test("the opening shows the owner's name and one-liner; the tour opens on the intro", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#act-boot")).toContainText("Sriram");
  await expect(page.locator("#act-boot")).toContainText("Architecting perfection");
  await page.goto("/#profile");
  await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", "tour");
  const intro = page.locator('#act-tour [data-stop="intro"]');
  await expect(intro).toBeVisible();
  await expect(intro).toContainText("Stevens Institute of Technology");
});
