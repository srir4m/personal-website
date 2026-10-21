import { describe, expect, it } from "vitest";
import { buildChapters, chapterAt, chapterHash, parseChapterHash, readChapterP, type SceneId } from "../../src/stage/chapters";

const chapters = buildChapters(true);
const ids = chapters.map((c) => c.id);
const SCENE_ORDER: SceneId[] = ["globe", "city", "street", "figure"];

describe("chapters", () => {
  it("run from the world to the person: home first, contact last, scenes never step back", () => {
    expect(ids[0]).toBe("home");
    expect(ids.at(-1)).toBe("contact");
    const scenes = chapters.map((c) => SCENE_ORDER.indexOf(c.scene));
    for (let i = 1; i < scenes.length; i++) expect(scenes[i]!, ids[i]).toBeGreaterThanOrEqual(scenes[i - 1]!);
  });

  it("have unique ids and hashes", () => {
    expect(new Set(ids).size).toBe(ids.length);
    const hashes = chapters.flatMap((c) => [c.hash, ...c.aliases]);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("take each tour region whole (no pages), and frame its region", () => {
    expect(ids.some((id) => /-\d+$/.test(id))).toBe(false);
    expect(chapters.find((c) => c.id === "build")).toMatchObject({ scene: "figure", region: "head" });
    expect(chapters.find((c) => c.id === "heart")?.region).toBe("heart");
  });

  it("keep every hash of the act layout working", () => {
    const lands = (hash: string) => ids[parseChapterHash(hash, chapters)!.chapter];
    expect(lands("#globe")).toBe("location");
    expect(lands("#descent")).toBe("campus");
    expect(lands("#becoming")).toBe("about");
    expect(lands("#profile")).toBe("about");
    expect(lands("#about")).toBe("about");
    expect(lands("#activities")).toBe("play");
    expect(lands("#body")).toBe("body");
    expect(lands("#outro")).toBe("contact");
    expect(parseChapterHash("#nowhere", chapters)).toBeNull();
    expect(parseChapterHash("", chapters)).toBeNull();
  });

  it("open a body-map region from #body/<region>, and write it back", () => {
    const link = parseChapterHash("#body/spine", chapters)!;
    expect(link.region).toBe("spine");
    expect(chapterHash(link.chapter, "spine", chapters)).toBe("body/spine");
    expect(parseChapterHash("#about/spine", chapters)!.region).toBeNull();
  });
});

describe("reading position", () => {
  // Three 600 px chapters stacked from the top of a 900 px window, scrolled by `y`.
  const boxes = (y: number) => [0, 600, 1200].map((top) => ({ top: top - y, height: 600 }));

  it("is 0 until the first chapter's middle reaches the reading line, then counts chapters", () => {
    // Middles at 300, 900, 1500 minus the scroll; the reading line is at 450.
    expect(readChapterP(boxes(-500), 900)).toBe(0);
    expect(readChapterP(boxes(-150), 900)).toBe(0);
    expect(readChapterP(boxes(0), 900)).toBeCloseTo(0.25, 9);
    expect(readChapterP(boxes(300), 900)).toBeCloseTo(0.75, 9);
    expect(readChapterP(boxes(600), 900)).toBeCloseTo(1.25, 9);
    expect(readChapterP(boxes(5000), 900)).toBe(2);
  });

  it("counts a chapter taller than the window by its first screenful", () => {
    const tall = [{ top: 0, height: 3000 }, { top: 3000, height: 600 }];
    // Middle of the first: 450 (its first 900 px); of the second: 3300.
    expect(readChapterP(tall, 900)).toBe(0);
    expect(readChapterP(tall.map((b) => ({ ...b, top: b.top - 2850 })), 900)).toBeCloseTo(1, 9);
  });

  it("rounds to the chapter being read", () => {
    expect(chapterAt(1.49, 5)).toBe(1);
    expect(chapterAt(1.5, 5)).toBe(2);
    expect(chapterAt(9, 5)).toBe(4);
  });
});
