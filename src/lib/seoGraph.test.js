import { describe, expect, it } from "vitest";
import { buildKeywordCoverageMap, buildSitemapStructure, deriveKeywordVariants, enrichToolForSeo, generateTools, toSlug } from "./seoGraph";

describe("seo graph", () => {
  it("slugifies keywords consistently", () => {
    expect(toSlug("Percentage Increase Calculator")).toBe("percentage-increase-calculator");
  });

  it("derives long-tail variants for a calculator query", () => {
    expect(deriveKeywordVariants("percentage calculator")).toContain("percentage increase calculator");
    expect(deriveKeywordVariants("percentage calculator")).toContain("reverse percentage calculator");
  });

  it("enriches tools with description, variants, and related links", () => {
    const tools = [
      {
        name: "JSON Formatter",
        slug: "json-formatter",
        category: "dev-tech",
        categoryName: "Dev + Tech",
        shortDescription: "Format JSON with clean indentation.",
        inputModel: "Text input",
        outputModel: "Formatted JSON",
        tags: ["json", "format"],
        aliases: []
      },
      {
        name: "JSON Minifier",
        slug: "json-minifier",
        category: "dev-tech",
        categoryName: "Dev + Tech",
        shortDescription: "Strip whitespace from JSON.",
        inputModel: "Text input",
        outputModel: "Minified JSON",
        tags: ["json", "minify"],
        aliases: []
      }
    ];

    const enriched = enrichToolForSeo(tools[0], tools);
    expect(enriched.description.length).toBeGreaterThan(150);
    expect(enriched.keywordVariants.length).toBeGreaterThanOrEqual(3);
    expect(enriched.relatedTools).toContain("json-minifier");
  });

  it("generates seed-based tool objects and coverage outputs", () => {
    const tools = generateTools("mixed", [
      "percentage calculator",
      "json formatter",
      "password generator",
      "png to jpg converter"
    ]);

    expect(tools).toHaveLength(4);
    expect(buildSitemapStructure(tools).categories.calculators).toContain("/tools/percentage-calculator");
    expect(buildKeywordCoverageMap(tools).totalTools).toBe(4);
  });
});
