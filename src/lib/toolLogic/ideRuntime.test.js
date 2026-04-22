import { describe, expect, it } from "vitest";
import { ideLanguageRegistry } from "../ideEngine";
import { runJavaScriptSnippet, runLightIdeCode } from "./ideRuntime";

describe("ideRuntime", () => {
  it("runs the JavaScript starter snippet", () => {
    const result = runJavaScriptSnippet(ideLanguageRegistry.javascript.starter);
    expect(result).toMatchObject({ ok: true });
    expect(result.output).toContain("Hello, Findtools");
  });

  it("runs every lightweight IDE starter snippet", () => {
    const lightLanguages = Object.entries(ideLanguageRegistry).filter(([, info]) => info.runtimeMode === "light");

    for (const [language, info] of lightLanguages) {
      const result = runLightIdeCode(language, info.starter);
      expect(result.ok, `${language} should run`).toBe(true);
      expect(result.output, `${language} output should include greeting`).toContain("Hello, Findtools");
    }
  });

  it("returns a readable error for unsupported statements", () => {
    const result = runLightIdeCode("python", "for name in names:\n  print(name)");
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Unsupported python statement");
  });
});
