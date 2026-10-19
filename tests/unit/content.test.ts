import { describe, expect, it } from "vitest";
import raw from "../../src/content/site-content.json";
import { validateContent, type Item } from "../../src/content/schema";
import { isPlaceholder, renderableItems, text } from "../../src/content/text";
import { collectStatus } from "../../src/dev/contentStatus";

describe("site-content.json", () => {
  it("passes the schema", () => {
    const result = validateContent(raw);
    expect(result.ok, result.ok ? "" : result.error).toBe(true);
  });

  it("rejects malformed content with a readable error", () => {
    const result = validateContent({ ...raw, owner: { name: 1 } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("owner");
  });
});

describe("placeholders", () => {
  it("treats null, empty and TODO strings as nothing", () => {
    for (const value of [null, undefined, "", "  ", "TODO", "TODO more favorites"]) {
      expect(isPlaceholder(value)).toBe(true);
      expect(text(value)).toBeNull();
    }
    expect(text("Todoist fan")).toBe("Todoist fan");
    expect(text("Chess")).toBe("Chess");
  });
});

describe("renderableItems", () => {
  const items: Item[] = [
    { title: "Now item" },
    { title: "Explicit now", mode: "now" },
    { title: "Reaching item", mode: "reaching" },
    { title: "Draft", draft: true },
    { title: "TODO later" },
  ];

  it("filters by pose mode, defaulting to now", () => {
    expect(renderableItems(items, "now", true).map((i) => i.title)).toEqual(["Now item", "Explicit now"]);
    expect(renderableItems(items, "reaching", true).map((i) => i.title)).toEqual(["Reaching item"]);
  });

  it("hides drafts only in production, and TODO titles always", () => {
    expect(renderableItems(items, "now", false).map((i) => i.title)).toContain("Draft");
    expect(renderableItems(items, "now", true).map((i) => i.title)).not.toContain("Draft");
    expect(renderableItems(items, "now", false).map((i) => i.title)).not.toContain("TODO later");
  });
});

describe("content status", () => {
  it("lists every null, TODO and draft field", () => {
    const entries = collectStatus(raw);
    expect(entries).toContainEqual({ path: "owner.name", kind: "TODO" });
    expect(entries).toContainEqual({ path: "owner.contact.email", kind: "null" });
    expect(entries).toContainEqual({ path: "body.regions.head.items[5]", kind: "draft" });
  });
});
