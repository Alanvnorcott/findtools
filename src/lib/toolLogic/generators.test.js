import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  generateCommentBlock,
  generateCompanyNameIdeas,
  generateFakeProfiles,
  generateProjectNameIdeas,
  generateUsernameIdeas,
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

  it("generates utility-focused username ideas", () => {
    const ideas = generateUsernameIdeas({ keyword: "design", style: "professional", count: 4, includeNumbers: false });
    expect(ideas).toHaveLength(4);
    expect(ideas.every((item) => /^[a-z0-9-]+$/.test(item))).toBe(true);
  });

  it("generates company and project names with reusable slugs", () => {
    const companies = generateCompanyNameIdeas({ industry: "software", tone: "modern", count: 3 });
    const projects = generateProjectNameIdeas({ projectType: "library", tone: "bold", count: 3 });
    expect(companies[0]).toHaveProperty("domainHint");
    expect(projects[0]).toHaveProperty("packageName");
  });

  it("generates fake offline profiles with useful fields", () => {
    const profiles = generateFakeProfiles({ role: "engineering", count: 2 });
    expect(profiles[0]).toHaveProperty("email");
    expect(profiles[0]).toHaveProperty("role");
  });
});
