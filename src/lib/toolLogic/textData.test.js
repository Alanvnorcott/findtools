import { describe, expect, it } from "vitest";
import { countTextStats, csvToJsonRecords, extractEmailDomains, jsonToCsvText, removePunctuation, sentenceCase } from "./textData";

describe("text/data logic", () => {
  it("counts core text stats", () => {
    expect(countTextStats("alpha beta\ncharlie")).toEqual({
      words: 3,
      characters: 18,
      charactersWithoutSpaces: 16,
      lines: 2
    });
  });

  it("maps csv rows to json records from the header row", () => {
    expect(csvToJsonRecords("name,email\nAva,ava@example.com\nBen,ben@example.com")).toEqual([
      { name: "Ava", email: "ava@example.com" },
      { name: "Ben", email: "ben@example.com" }
    ]);
  });

  it("converts object arrays back into csv", () => {
    expect(jsonToCsvText('[{"name":"Ava","team":"Product"},{"name":"Ben","team":"Engineering"}]')).toBe(
      "name,team\nAva,Product\nBen,Engineering"
    );
  });

  it("normalizes text into sentence case", () => {
    expect(sentenceCase("hello world. THIS IS LOUD! new sentence?")).toBe("Hello world. This is loud! New sentence?");
  });

  it("removes punctuation and extracts unique email domains", () => {
    expect(removePunctuation("Hello, tools! #1.")).toBe("Hello tools 1");
    expect(extractEmailDomains("a@findtools.net and b@example.com and c@findtools.net")).toEqual([
      "findtools.net",
      "example.com"
    ]);
  });
});
