import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  generateCommentBlock,
  mixHexColors,
  normalizeHex
} from "./generators";

describe("generator tool logic", () => {
  it("formats block and line comments predictably", () => {
    expect(generateCommentBlock("hello\nworld", { mode: "block", open: "/*", close: "*/" })).toBe("/*\nhello\nworld\n*/");
    expect(generateCommentBlock("hello\nworld", { mode: "line", prefix: "#" })).toBe("# hello\n# world");
  });

  it("normalizes and mixes hex colors", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(mixHexColors("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("calculates contrast ratio for black and white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
});
