import { describe, expect, it } from "vitest";
import { calculateAspectRatio, calculateGradePercentage, calculatePercentage, calculateRunway, evaluateWeightedDecision } from "./calculators";

describe("calculator logic", () => {
  it("calculates a basic percentage", () => {
    expect(calculatePercentage(400, 15)).toEqual({ value: 400, percent: 15, result: 60 });
  });

  it("simplifies an aspect ratio and derives a target dimension", () => {
    expect(calculateAspectRatio({ width: 1920, height: 1080, targetWidth: 1200 })).toMatchObject({
      ratioWidth: 16,
      ratioHeight: 9,
      heightAtTargetWidth: 675
    });
  });

  it("totals a weighted decision matrix", () => {
    expect(evaluateWeightedDecision("Price|5|8|6\nSpeed|4|7|9\nRisk|3|9|6")).toEqual({
      rows: [
        { criterion: "Price", weight: 5, scoreA: 8, scoreB: 6 },
        { criterion: "Speed", weight: 4, scoreA: 7, scoreB: 9 },
        { criterion: "Risk", weight: 3, scoreA: 9, scoreB: 6 }
      ],
      totals: { a: 95, b: 84 }
    });
  });

  it("calculates grade percentages and runway months", () => {
    expect(calculateGradePercentage(42, 50)).toEqual({ earned: 42, possible: 50, percentage: 84 });
    expect(calculateRunway(60000, 5000)).toEqual({ cash: 60000, monthlyBurn: 5000, months: 12 });
  });
});
