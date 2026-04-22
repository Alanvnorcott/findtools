import { describe, expect, it } from "vitest";
import { format, minify, transform, validate } from "./codingLanguageEngine";

describe("codingLanguageEngine", () => {
  it("formats and minifies code by language", () => {
    expect(format("function test(){return 1;}", "javascript")).toContain("function test()");
    expect(minify("SELECT id, name\nFROM users", "sql")).toBe("SELECT id, name FROM users");
  });

  it("validates structured languages", () => {
    expect(validate("<root><item></root>", "xml")).toMatchObject({ valid: false });
    expect(validate("app:\n  name: test", "yaml")).toMatchObject({ valid: true });
  });

  it("transforms json and pseudocode into language-specific output", () => {
    expect(transform('{"user":{"name":"Ava"}}', "json", "model", "typescript")).toContain("interface RootModel");
    expect(transform("IF total > 0 THEN\nRETURN total\nEND IF", "pseudocode", "code", "python")).toContain("if total > 0:");
  });
});
