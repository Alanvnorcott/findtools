import { describe, expect, it } from "vitest";
import {
  basicStats,
  binaryFromText,
  businessDaysInYear,
  determinant2x2,
  isoWeekNumber,
  percentageChange,
  reversePercentage,
  textFromBinary,
  transferTimeSeconds
} from "./longTail";

describe("long-tail tool logic", () => {
  it("handles percentage change and reverse calculations", () => {
    expect(percentageChange(100, 120)).toBe(20);
    expect(reversePercentage(120, 20, "increase")).toBeCloseTo(100);
    expect(reversePercentage(80, 20, "decrease")).toBeCloseTo(100);
  });

  it("calculates calendar and transfer helpers", () => {
    expect(businessDaysInYear(2026)).toBeGreaterThan(250);
    expect(isoWeekNumber("2026-01-05")).toBe(2);
    expect(transferTimeSeconds(100, 50)).toBe(16);
  });

  it("computes stats and matrix determinants", () => {
    expect(basicStats([1, 2, 2, 4])).toMatchObject({
      average: 2.25,
      median: 2,
      mode: [2]
    });
    expect(determinant2x2([[1, 2], [3, 4]])).toBe(-2);
  });

  it("converts text and binary both ways", () => {
    const binary = binaryFromText("Hi");
    expect(binary).toBe("01001000 01101001");
    expect(textFromBinary(binary)).toBe("Hi");
  });
});
