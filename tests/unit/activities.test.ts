import { describe, expect, it } from "vitest";
import { buildActivities, rankedGames } from "../../src/acts/Activities/activities";

describe("activities", () => {
  const cards = buildActivities(true);
  const titles = cards.map((c) => c.title);

  it("are built only from existing content: hobby regions, flagged items, and gaming", () => {
    expect(titles).toContain("Chess");
    expect(titles).toContain("Swimming");
    expect(titles).toContain("Darien Young Composers");
    expect(titles).not.toContain("Sponge"); // work, not an activity
    expect(titles.at(-1)).toBe("Gaming"); // gaming last: one activity among several
  });

  it("link every non-gaming card to its body map region", () => {
    for (const card of cards.filter((c) => c.title !== "Gaming")) expect(card.region, card.title).toBeTruthy();
    expect(cards.find((c) => c.title === "Swimming")!.region).toBe("legs");
    expect(cards.find((c) => c.title === "Trekking the Himalayas")).toMatchObject({ region: "legs", glyph: "mountain" });
    expect(cards.find((c) => c.title === "Travel")).toMatchObject({ region: "legs", glyph: "compass" });
  });

  it("never show drafts or placeholders in production", () => {
    expect(titles.some((t) => /TODO/.test(t))).toBe(false);
  });

  it("summarise gaming with the ranks that are filled in", () => {
    expect(rankedGames()).toEqual(["Counter-Strike 2 · 17,000 Premier", "VALORANT · Platinum"]);
    expect(cards.at(-1)!.subtitle).toBe("Counter-Strike 2 · 17,000 Premier");
  });
});
