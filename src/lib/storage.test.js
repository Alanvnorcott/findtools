import { describe, expect, it } from "vitest";
import { addRecentTool, asSlugList, togglePinnedTool } from "./storage";

describe("storage helpers", () => {
  it("normalizes only string slug arrays", () => {
    expect(asSlugList(["json-formatter", "", 42, null, "word-counter"])).toEqual(["json-formatter", "word-counter"]);
    expect(asSlugList("json-formatter")).toEqual([]);
    expect(asSlugList(null)).toEqual([]);
  });

  it("keeps recent tools safe even with malformed stored values", () => {
    expect(addRecentTool("not-an-array", "json-formatter")).toEqual(["json-formatter"]);
    expect(addRecentTool(["word-counter", "json-formatter"], "json-formatter")).toEqual(["json-formatter", "word-counter"]);
  });

  it("toggles pinned tools safely", () => {
    expect(togglePinnedTool({ bad: true }, "json-formatter")).toEqual(["json-formatter"]);
    expect(togglePinnedTool(["json-formatter", "word-counter"], "json-formatter")).toEqual(["word-counter"]);
  });
});
