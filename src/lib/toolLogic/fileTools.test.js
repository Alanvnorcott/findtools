import { describe, expect, it } from "vitest";
import { parsePageRange } from "./fileTools";

describe("file tool logic", () => {
  it("parses single pages and ranges into zero-based indexes", () => {
    expect(parsePageRange("1,3-5", 8)).toEqual([0, 2, 3, 4]);
  });

  it("filters out-of-bounds pages", () => {
    expect(parsePageRange("0,2,6-8", 5)).toEqual([1]);
  });

  it("deduplicates overlapping ranges", () => {
    expect(parsePageRange("1-3,2,3", 5)).toEqual([0, 1, 2]);
  });
});
