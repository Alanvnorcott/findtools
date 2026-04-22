import { describe, expect, it } from "vitest";
import { toolRegistry } from "./toolRegistry";

describe("tool registry", () => {
  it("keeps every slug and alias unique", () => {
    const seen = new Set();

    for (const tool of toolRegistry) {
      for (const value of [tool.slug, ...(tool.aliases || [])]) {
        expect(seen.has(value)).toBe(false);
        seen.add(value);
      }
    }
  });
});
