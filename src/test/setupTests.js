import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
});

if (typeof window !== "undefined" && typeof Range !== "undefined") {
  const emptyRects = () => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* iterator() {}
  });

  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = emptyRects;
  }

  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    });
  }
}
