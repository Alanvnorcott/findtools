function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeHex(hex) {
  const value = String(hex ?? "").trim().replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value.split("").map((char) => char + char).join("").toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return `#${value.toLowerCase()}`;
  }
  return "#000000";
}

export function hexToRgb(hex) {
  const normalized = normalizeHex(hex).slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

export function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function mixHexColors(colorA, colorB, ratio = 0.5) {
  const left = hexToRgb(colorA);
  const right = hexToRgb(colorB);
  const mix = clamp(Number(ratio) || 0, 0, 1);
  return rgbToHex(
    left.r + (right.r - left.r) * mix,
    left.g + (right.g - left.g) * mix,
    left.b + (right.b - left.b) * mix
  );
}

export function shiftColorToward(hex, targetHex, ratio) {
  return mixHexColors(hex, targetHex, ratio);
}

export function generateCommentBlock(value, syntax) {
  const text = String(value ?? "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");

  if (!syntax || syntax.mode === "raw") {
    return text;
  }

  if (syntax.mode === "block") {
    const body = lines.map((line) => `${syntax.linePrefix || ""}${line}${syntax.lineSuffix || ""}`).join("\n");
    return `${syntax.open}\n${body}\n${syntax.close}`;
  }

  const prefix = syntax.prefix || "//";
  const spacer = syntax.space === false ? "" : " ";
  return lines
    .map((line) => (line ? `${prefix}${spacer}${line}` : `${prefix}`))
    .join("\n");
}

function srgbToLinear(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(colorA, colorB) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const luminance = ({ r, g, b: blue }) =>
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(blue);
  const l1 = luminance(a);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
