function toTitleCase(value) {
  return String(value ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function toSlug(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitIntent(primaryKeyword) {
  const keyword = String(primaryKeyword ?? "").toLowerCase();
  if (keyword.includes(" calculator")) return { subject: keyword.replace(/ calculator$/, ""), type: "calculator" };
  if (keyword.includes(" converter")) return { subject: keyword.replace(/ converter$/, ""), type: "converter" };
  if (keyword.includes(" formatter")) return { subject: keyword.replace(/ formatter$/, ""), type: "formatter" };
  if (keyword.includes(" generator")) return { subject: keyword.replace(/ generator$/, ""), type: "generator" };
  if (keyword.includes(" parser")) return { subject: keyword.replace(/ parser$/, ""), type: "parser" };
  if (keyword.includes(" checker")) return { subject: keyword.replace(/ checker$/, ""), type: "checker" };
  return { subject: keyword, type: "tool" };
}

function invertConverterSubject(subject) {
  const match = subject.match(/^(.+?) to (.+)$/);
  if (!match) return null;
  return `${match[2]} to ${match[1]}`;
}

const specificVariantMap = {
  "percentage calculator": [
    "percentage increase calculator",
    "percentage decrease calculator",
    "percentage difference calculator",
    "reverse percentage calculator",
    "percentage of number calculator"
  ],
  "json formatter": [
    "json formatter online",
    "json prettifier",
    "json beautifier",
    "json minifier",
    "compare two json files"
  ],
  "csv cleaner": [
    "format csv online",
    "csv to json",
    "json to csv",
    "csv delimiter converter",
    "csv dedupe by column"
  ],
  "password generator": [
    "password generator online",
    "random password phrase generator",
    "pin generator",
    "secure token generator",
    "uuid generator"
  ],
  "pdf split": [
    "split pdf pages online",
    "pdf extract pages",
    "pdf page delete",
    "pdf page reorder",
    "pdf to images"
  ]
};

function genericVariants(primaryKeyword) {
  const keyword = String(primaryKeyword ?? "").toLowerCase();
  const { subject, type } = splitIntent(keyword);
  const variants = [keyword];

  if (type === "calculator") {
    variants.push(`${subject} calculator online`, `${subject} calculator free`, `${subject} formula calculator`);
  } else if (type === "converter") {
    variants.push(`${subject} converter online`, `${subject} conversion calculator`);
    const inverse = invertConverterSubject(subject);
    if (inverse) variants.push(`${inverse} converter`);
  } else if (type === "formatter") {
    variants.push(`${subject} formatter online`, `${subject} beautifier`, `${subject} minifier`);
  } else if (type === "generator") {
    variants.push(`${subject} generator online`, `random ${subject} generator`, `${subject} maker`);
  } else if (type === "parser") {
    variants.push(`${subject} parser online`, `${subject} reader`, `${subject} analyzer`);
  } else if (type === "checker") {
    variants.push(`${subject} checker online`, `${subject} validator`, `${subject} test tool`);
  } else {
    variants.push(`${keyword} online`, `${keyword} free`, `${keyword} browser tool`);
  }

  return variants;
}

export function deriveKeywordVariants(primaryKeyword) {
  const keyword = String(primaryKeyword ?? "").toLowerCase().trim();
  const variants = specificVariantMap[keyword] || genericVariants(keyword);
  return [...new Set(variants.filter(Boolean))].slice(0, 10);
}

function buildExamples(tool) {
  if (tool.examples?.length) return tool.examples;

  return [
    `Use ${tool.name.toLowerCase()} to turn ${tool.inputModel.toLowerCase()} into ${tool.outputModel.toLowerCase()}.`,
    `Keep the ${tool.shortDescription.toLowerCase()} workflow local in the browser without uploads.`,
    `Copy the result immediately and move to the next task without leaving Findtools.`
  ];
}

function buildUseCases(tool) {
  if (tool.useCases?.length) return tool.useCases;

  return [
    `Handle quick ${tool.tags.slice(0, 2).join(" and ")} work without opening heavier software.`,
    `Solve one focused ${tool.categoryName.toLowerCase()} task during day-to-day work.`,
    `Get copy-ready output instantly with no account, backend, or file upload.`
  ];
}

function buildFaqs(tool) {
  if (tool.faqs?.length) return tool.faqs;

  return [
    {
      question: `What does ${tool.name.toLowerCase()} do?`,
      answer: `${tool.name} helps you ${tool.shortDescription.charAt(0).toLowerCase()}${tool.shortDescription.slice(1)}`
    },
    {
      question: "Does it send my data anywhere?",
      answer: tool.supportsLocalFiles
        ? "No. Files are processed locally in the browser and are not uploaded or retained."
        : "No. The input stays in the browser and is not uploaded or retained."
    },
    {
      question: "When is this useful?",
      answer: `It is useful when you need ${tool.outputModel.toLowerCase()} from ${tool.inputModel.toLowerCase()} quickly and without extra setup.`
    }
  ];
}

export function buildToolDescription(tool) {
  const keyword = tool.primaryKeyword || tool.name.toLowerCase();
  const example = buildExamples(tool)[0];
  const useCase = buildUseCases(tool)[0];
  const localLine = tool.supportsLocalFiles
    ? "Any files you use stay on your device and are processed locally in the browser."
    : "Everything runs locally in the browser, so the text or values you enter are not uploaded or retained.";

  return `${toTitleCase(keyword)} is meant for people who need a direct answer without wading through a bloated workflow. ` +
    `The page is built around one clear job: ${tool.shortDescription.charAt(0).toLowerCase()}${tool.shortDescription.slice(1)} ` +
    `You enter ${tool.inputModel.toLowerCase()}, the result updates immediately, and the output is ready to copy or reuse in the rest of your work. ` +
    `${localLine} ` +
    `${example} ` +
    `${useCase} ` +
    `Because the interface stays narrow and predictable, the tool works well as a daily utility you can keep beside your normal tasks instead of treating it like a separate app. ` +
    `If you hit an edge case, the page still keeps the rules visible through the output structure, related tools, and short guidance instead of hiding the logic behind a black box.`;
}

function findCandidateTools(tool, allTools) {
  return allTools
    .filter((entry) => entry.slug !== tool.slug)
    .map((entry) => {
      let score = 0;
      if (entry.category === tool.category) score += 3;
      score += entry.tags.filter((tag) => tool.tags.includes(tag)).length * 2;
      if ((entry.primaryKeyword || entry.name).toLowerCase().includes(tool.tags[0] || "")) score += 1;
      if ((tool.aliases || []).includes(entry.slug) || (entry.aliases || []).includes(tool.slug)) score += 4;
      return { slug: entry.slug, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
}

export function pickRelatedToolSlugs(tool, allTools, limit = 8) {
  const preferred = (tool.relatedTools || []).filter((slug) => allTools.some((entry) => entry.slug === slug));
  const derived = findCandidateTools(tool, allTools).map((item) => item.slug);
  return [...new Set([...preferred, ...derived])].slice(0, limit);
}

export function enrichToolForSeo(tool, allTools) {
  const existingKeywords = new Set(
    allTools.flatMap((entry) => [
      (entry.primaryKeyword || entry.name).toLowerCase(),
      entry.slug.replace(/-/g, " "),
      ...(entry.aliases || []).map((alias) => alias.replace(/-/g, " "))
    ])
  );

  const primaryKeyword = (tool.primaryKeyword || tool.name).toLowerCase();
  const keywordVariants = deriveKeywordVariants(primaryKeyword);
  const missingVariants = keywordVariants.filter((variant) => !existingKeywords.has(variant) && variant !== primaryKeyword);

  return {
    ...tool,
    primaryKeyword,
    keywordVariants,
    missingVariants,
    description: tool.description || buildToolDescription(tool),
    useCases: buildUseCases(tool),
    examples: buildExamples(tool),
    faqs: buildFaqs(tool),
    relatedTools: pickRelatedToolSlugs(tool, allTools, 8)
  };
}

function inferCategoryFromKeyword(keyword, fallbackCategory = "text-data") {
  const value = keyword.toLowerCase();
  if (value.includes("calculator")) return "calculators";
  if (value.includes("converter")) return "conversion";
  if (value.includes("formatter") || value.includes("parser") || value.includes("validator")) return "dev-tech";
  if (value.includes("generator")) return "generators";
  return fallbackCategory;
}

function inferInputs(keyword) {
  const value = keyword.toLowerCase();
  if (value.includes("calculator")) return ["numeric inputs"];
  if (value.includes("converter")) return ["source value"];
  if (value.includes("formatter")) return ["raw text input"];
  if (value.includes("generator")) return ["small option set"];
  return ["text input"];
}

export function generateTools(category, seedKeywords = []) {
  const seen = new Set();
  const generated = [];

  for (const seed of seedKeywords) {
    const primaryKeyword = String(seed).toLowerCase().trim();
    const slug = toSlug(primaryKeyword);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const resolvedCategory = category === "mixed" ? inferCategoryFromKeyword(primaryKeyword) : category;
    generated.push({
      name: toTitleCase(primaryKeyword),
      slug,
      category: resolvedCategory,
      primaryKeyword,
      keywordVariants: deriveKeywordVariants(primaryKeyword),
      missingVariants: [],
      description: "",
      inputs: inferInputs(primaryKeyword),
      logic: () => null,
      relatedTools: []
    });
  }

  return generated.map((tool, index, list) => {
    const relatedTools = list
      .filter((entry) => entry.slug !== tool.slug)
      .filter((entry) => entry.category === tool.category || entry.primaryKeyword.split(" ")[0] === tool.primaryKeyword.split(" ")[0])
      .slice(0, 8)
      .map((entry) => entry.slug);

    return {
      ...tool,
      missingVariants: tool.keywordVariants.filter((variant) => !seen.has(toSlug(variant)) && variant !== tool.primaryKeyword),
      description: buildToolDescription({
        ...tool,
        shortDescription: `solve the ${tool.primaryKeyword} job quickly in the browser.`,
        inputModel: inferInputs(tool.primaryKeyword).join(", "),
        outputModel: "instant result",
        categoryName: toTitleCase(tool.category.replace(/-/g, " ")),
        tags: tool.primaryKeyword.split(" ").slice(0, 3),
        supportsLocalFiles: false,
        examples: [`Use ${tool.primaryKeyword} when you need a direct browser-based answer with no backend.`],
        useCases: [`Cover the long-tail query ${tool.primaryKeyword} with a dedicated page.`]
      }),
      relatedTools: relatedTools.length ? relatedTools : list.slice(Math.max(0, index - 2), index + 3).filter((entry) => entry.slug !== tool.slug).map((entry) => entry.slug)
    };
  });
}

export function buildSitemapStructure(tools) {
  const grouped = tools.reduce((acc, tool) => {
    const key = tool.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(`/tools/${tool.slug}`);
    return acc;
  }, {});

  return {
    home: ["/", "/sitemap", "/about", "/privacy", "/terms"],
    categories: Object.fromEntries(
      Object.entries(grouped).map(([category, routes]) => [category, [`/category/${category}`, ...routes]])
    )
  };
}

export function buildKeywordCoverageMap(tools) {
  const byCategory = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = { tools: 0, missingVariants: 0, keywords: [] };
    acc[tool.category].tools += 1;
    acc[tool.category].missingVariants += (tool.missingVariants || []).length;
    acc[tool.category].keywords.push(tool.primaryKeyword);
    return acc;
  }, {});

  return {
    totalTools: tools.length,
    totalMissingVariants: tools.reduce((sum, tool) => sum + (tool.missingVariants || []).length, 0),
    categories: byCategory
  };
}
