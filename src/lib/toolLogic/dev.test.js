import { describe, expect, it } from "vitest";
import { readJsonPath, transformBase64 } from "./dev";

describe("dev logic", () => {
  it("encodes and decodes unicode-safe base64", () => {
    const encoded = transformBase64("Findtools keeps it local.", "encode");
    expect(transformBase64(encoded, "decode")).toBe("Findtools keeps it local.");
  });

  it("returns a clear message for invalid base64", () => {
    expect(transformBase64("%%%not-base64%%%", "decode")).toBe("Invalid Base64 input.");
  });

  it("reads dot and bracket json paths", () => {
    const input = { user: { profile: { name: "Ava" }, items: [{ id: 1 }, { id: 2 }] } };
    expect(readJsonPath(input, "user.profile.name")).toBe("Ava");
    expect(readJsonPath(input, "user.items[1].id")).toBe(2);
  });
});
