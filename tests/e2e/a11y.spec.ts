import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ACTS = ["", "globe", "descent", "becoming", "profile", "body", "outro"];
/** The act id each hash lands on. */
const ACT_OF: Record<string, string> = { "": "boot", profile: "tour" };

// WCAG 2.2 AA plus axe's best practices, on every act at both viewport sizes.
for (const act of ACTS) {
  test(`axe finds no violations on ${act || "boot"}`, async ({ page }) => {
    await page.goto(act ? `/#${act}` : "/");
    await expect(page.locator("[data-active-act]")).toHaveAttribute("data-active-act", ACT_OF[act] ?? act);
    await page.waitForTimeout(800);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}
