import { describe, expect, it } from "vitest";
import { BODY_REGIONS, isDormant, regionItems } from "../../src/acts/Act5Body/regions";

describe("body regions", () => {
  it("follow the PRD's tab order", () => {
    expect(BODY_REGIONS.map((r) => r.id)).toEqual(["head", "ears", "heart", "chest", "spine", "arms", "stomach", "legs", "feet"]);
  });

  it("take labels and themes from the content, and the heart is the vault", () => {
    expect(BODY_REGIONS.find((r) => r.id === "head")).toMatchObject({ label: "Mind", theme: "What I build and play" });
    expect(BODY_REGIONS.find((r) => r.id === "heart")).toMatchObject({ label: "Heart", theme: "The vault" });
  });

  it("filters items by pose and hides drafts in production", () => {
    const ears = BODY_REGIONS.find((r) => r.id === "ears")!;
    expect(regionItems(ears, "now", true).map((i) => i.title)).toEqual(["Darien Young Composers"]);
    expect(regionItems(ears, "reaching", true).map((i) => i.title)).toEqual(["Guitar"]);
    const spine = BODY_REGIONS.find((r) => r.id === "spine")!;
    expect(regionItems(spine, "now", true).some((i) => /TODO/.test(i.title))).toBe(false);
  });

  it("marks empty regions dormant, but never the heart", () => {
    const byId = (id: string) => BODY_REGIONS.find((r) => r.id === id)!;
    expect(isDormant(byId("feet"), "now", true)).toBe(true);
    expect(isDormant(byId("head"), "reaching", true)).toBe(true); // its only reaching item is a draft
    expect(isDormant(byId("head"), "reaching", false)).toBe(false); // drafts show in dev
    expect(isDormant(byId("heart"), "reaching", true)).toBe(false);
  });
});
