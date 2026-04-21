import { toolRegistry } from "./toolRegistry.js";
import { buildKeywordCoverageMap, buildSitemapStructure, enrichToolForSeo, generateTools } from "../lib/seoGraph.js";

export const seoToolGraph = toolRegistry.map((tool) => enrichToolForSeo(tool, toolRegistry));

export const coreSeoTools = [
  ...generateTools("text-data", [
    "json formatter",
    "csv cleaner",
    "word counter",
    "remove duplicate words",
    "extract emails from text"
  ]),
  ...generateTools("calculators", [
    "percentage calculator",
    "compound interest calculator",
    "take home pay calculator",
    "rent affordability calculator",
    "buy vs rent calculator"
  ]),
  ...generateTools("dev-tech", [
    "json path tester",
    "yaml formatter",
    "url parser",
    "curl builder",
    "semantic version bump calculator"
  ]),
  ...generateTools("generators", [
    "password generator",
    "qr code generator",
    "username generator",
    "coupon code generator",
    "project name generator"
  ])
];

export const seoSitemapStructure = buildSitemapStructure(seoToolGraph);
export const keywordCoverageMap = buildKeywordCoverageMap(seoToolGraph);
