import { describe, expect, it } from "vitest";
import { getIdeLanguage, getIdeLanguages, ideDraftKey } from "./ideEngine";

describe("ideEngine", () => {
  it("exposes the requested interpreted languages", () => {
    expect(getIdeLanguages()).toEqual(
      expect.arrayContaining(["python", "javascript", "php", "ruby", "perl", "r", "lua", "matlab", "lisp", "basic", "bash", "powershell", "vbscript"])
    );
  });

  it("returns language metadata and draft keys", () => {
    expect(getIdeLanguage("python")).toMatchObject({ label: "Python", editorLanguage: "python" });
    expect(ideDraftKey("python")).toBe("findtools:ide:python");
  });
});
