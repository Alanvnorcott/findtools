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

function hashSeed(value) {
  return String(value ?? "")
    .split("")
    .reduce((total, char, index) => (total * 31 + char.charCodeAt(0) + index) % 2147483647, 17);
}

function pickFrom(list, seed, offset = 0) {
  if (!list.length) return "";
  return list[(hashSeed(`${seed}:${offset}`) + offset) % list.length];
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

export function generateUsernameIdeas({
  keyword = "",
  style = "professional",
  count = 8,
  includeNumbers = true
} = {}) {
  const pools = {
    professional: {
      prefixes: ["clear", "steady", "north", "solid", "quiet", "trusted"],
      suffixes: ["studio", "signal", "works", "build", "ops", "team"]
    },
    creator: {
      prefixes: ["pixel", "loop", "frame", "analog", "ember", "mono"],
      suffixes: ["craft", "maker", "lab", "daily", "notes", "edit"]
    },
    tech: {
      prefixes: ["vector", "kernel", "stack", "query", "binary", "cloud"],
      suffixes: ["forge", "ops", "dev", "stack", "sync", "build"]
    },
    short: {
      prefixes: ["zen", "ark", "flux", "rift", "nova", "grid"],
      suffixes: ["io", "hq", "co", "lab", "hub", "kit"]
    }
  };
  const selected = pools[style] || pools.professional;
  const seed = `${keyword}:${style}:${count}:${includeNumbers}`;
  const cleanKeyword = slugify(keyword).replace(/-/g, "");

  return uniqueValues(
    Array.from({ length: count }, (_, index) => {
      const prefix = pickFrom(selected.prefixes, seed, index);
      const suffix = pickFrom(selected.suffixes, seed, index + 9);
      const number = includeNumbers ? String((hashSeed(`${seed}:${index}:number`) % 89) + 11) : "";
      return slugify([prefix, cleanKeyword || suffix, cleanKeyword ? suffix : "", number].filter(Boolean).join("-"));
    })
  ).slice(0, count);
}

export function generateCompanyNameIdeas({
  industry = "software",
  tone = "clear",
  count = 8
} = {}) {
  const toneWords = {
    clear: ["Clear", "Plain", "True", "Open", "Direct", "Sure"],
    premium: ["North", "Summit", "Prime", "Sterling", "Foundry", "Apex"],
    modern: ["Vector", "Signal", "Relay", "Pixel", "Circuit", "Orbit"],
    warm: ["Harbor", "Maple", "Cedar", "Hearth", "Field", "Bright"]
  };
  const industryWords = {
    software: ["Systems", "Labs", "Cloud", "Platform", "Works", "Logic"],
    finance: ["Capital", "Ledger", "Advisors", "Partners", "Wealth", "Growth"],
    health: ["Health", "Care", "Wellness", "Clinic", "Life", "Vitals"],
    retail: ["Supply", "Goods", "Market", "Store", "Collective", "Trade"]
  };
  const left = toneWords[tone] || toneWords.clear;
  const right = industryWords[industry] || industryWords.software;
  const seed = `${industry}:${tone}:${count}`;

  return uniqueValues(
    Array.from({ length: count }, (_, index) => {
      const name = `${pickFrom(left, seed, index)} ${pickFrom(right, seed, index + 17)}`;
      return `${name}|${slugify(name)}`;
    })
  )
    .slice(0, count)
    .map((entry) => {
      const [name, slug] = entry.split("|");
      return { name, slug, domainHint: `${slug}.com` };
    });
}

export function generateProjectNameIdeas({
  projectType = "app",
  tone = "practical",
  count = 8
} = {}) {
  const toneWords = {
    practical: ["Atlas", "Relay", "Harbor", "Ledger", "Canvas", "Beacon"],
    bold: ["Forge", "Strata", "Vector", "Pulse", "Signal", "Apex"],
    calm: ["Drift", "Moss", "Cinder", "North", "Quiet", "Hollow"]
  };
  const typeWords = {
    app: ["App", "Desk", "Flow", "Hub", "Kit", "Suite"],
    library: ["Core", "Lib", "Kit", "Engine", "Module", "Stack"],
    internal: ["Ops", "Desk", "Panel", "Portal", "Board", "Console"]
  };
  const left = toneWords[tone] || toneWords.practical;
  const right = typeWords[projectType] || typeWords.app;
  const seed = `${projectType}:${tone}:${count}`;

  return uniqueValues(
    Array.from({ length: count }, (_, index) => {
      const name = `${pickFrom(left, seed, index)} ${pickFrom(right, seed, index + 21)}`;
      return `${name}|${slugify(name)}`;
    })
  )
    .slice(0, count)
    .map((entry) => {
      const [name, slug] = entry.split("|");
      return { name, repo: slug, packageName: slug.replace(/-/g, "_") };
    });
}

export function generateFakeProfiles({
  role = "product",
  count = 6
} = {}) {
  const firstNames = ["Ava", "Maya", "Luca", "Noah", "Iris", "Owen", "Nina", "Jules", "Evan", "Clara"];
  const lastNames = ["Carter", "Bennett", "Foster", "Morris", "Harper", "Sullivan", "Reed", "Parker", "Lopez", "Nguyen"];
  const cities = ["Denver", "Austin", "Portland", "Chicago", "Boise", "Seattle", "Raleigh", "Madison"];
  const roles = {
    product: ["Product Manager", "UX Researcher", "Product Designer", "Growth Lead"],
    engineering: ["Frontend Engineer", "Backend Engineer", "DevOps Engineer", "QA Engineer"],
    sales: ["Account Executive", "Sales Ops Lead", "Customer Success Manager", "Revenue Analyst"],
    support: ["Support Specialist", "Onboarding Lead", "Implementation Manager", "Community Manager"]
  };
  const selectedRoles = roles[role] || roles.product;
  const seed = `${role}:${count}`;

  return Array.from({ length: count }, (_, index) => {
    const first = pickFrom(firstNames, seed, index);
    const last = pickFrom(lastNames, seed, index + 13);
    const fullName = `${first} ${last}`;
    const slug = slugify(fullName).replace(/-/g, ".");
    return {
      name: fullName,
      email: `${slug}@example.test`,
      city: pickFrom(cities, seed, index + 31),
      role: pickFrom(selectedRoles, seed, index + 47)
    };
  });
}
