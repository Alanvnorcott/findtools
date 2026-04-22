function normalizeText(value) {
  return String(value ?? "").replace(/\r\n/g, "\n");
}

export function validateEnvFile(input) {
  const keys = new Set();
  const errors = [];
  const items = normalizeText(input)
    .split("\n")
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line && !line.startsWith("#"))
    .map(({ line, lineNumber }) => {
      const [key, ...rest] = line.split("=");
      const name = (key || "").trim();
      const value = rest.join("=").trim();
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(name)) errors.push(`Line ${lineNumber}: invalid variable name.`);
      if (keys.has(name)) errors.push(`Line ${lineNumber}: duplicate key "${name}".`);
      keys.add(name);
      return { key: name, value };
    });
  return { valid: errors.length === 0, errors, items };
}

export function buildGitCommand(intent, options = {}) {
  const branch = options.branch || "feature/update";
  const message = options.message || "Update files";
  const file = options.file || ".";
  const remote = options.remote || "origin";
  switch (intent) {
    case "commit":
      return `git add ${file}\ngit commit -m "${message}"`;
    case "branch":
      return `git checkout -b ${branch}`;
    case "push":
      return `git push ${remote} ${branch}`;
    case "undo-last-commit":
      return "git reset --soft HEAD~1";
    case "sync-main":
      return "git checkout main\ngit pull --ff-only origin main";
    default:
      return "git status";
  }
}

export function buildDockerfile(runtime, appType, entrypoint) {
  const start = entrypoint || (runtime === "python" ? "app.py" : "server.js");
  if (runtime === "python") {
    return `FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt ./\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD ["python", "${start}"]`;
  }
  if (runtime === "go") {
    return `FROM golang:1.24-alpine AS build\nWORKDIR /app\nCOPY . .\nRUN go build -o app .\nFROM alpine:3.20\nWORKDIR /app\nCOPY --from=build /app/app ./app\nCMD ["./app"]`;
  }
  const install = appType === "static-site" ? "npm ci\nRUN npm run build" : "npm ci";
  const cmd = appType === "static-site" ? 'CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]' : `CMD ["node", "${start}"]`;
  return `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN ${install}\nCOPY . .\n${cmd}`;
}

export function buildCicdYaml(provider, runtime, command) {
  const runCommand = command || "npm test && npm run build";
  const version = runtime === "python" ? "3.12" : "20";
  if (provider === "gitlab") {
    return `image: ${runtime === "python" ? "python:3.12" : "node:20"}\n\nstages:\n  - test\n  - build\n\ntest:\n  stage: test\n  script:\n    - ${runCommand}\n\nbuild:\n  stage: build\n  script:\n    - ${runCommand}`;
  }
  if (provider === "circleci") {
    return `version: 2.1\njobs:\n  build:\n    docker:\n      - image: cimg/${runtime === "python" ? "python" : "node"}:${version}\n    steps:\n      - checkout\n      - run: ${runCommand}\nworkflows:\n  build:\n    jobs:\n      - build`;
  }
  return `name: CI\non:\n  push:\n    branches: [main]\n  pull_request:\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-${runtime === "python" ? "python" : "node"}@v4\n        with:\n          ${runtime === "python" ? "python-version" : "node-version"}: ${version}\n      - run: ${runCommand}`;
}

export function formatStackTrace(input) {
  return normalizeText(input)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const jsMatch = line.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/);
      const pyMatch = line.match(/File "(.*?)", line (\d+), in (.*)/);
      if (jsMatch) {
        return {
          frame: index + 1,
          functionName: jsMatch[1],
          file: jsMatch[2],
          line: jsMatch[3],
          column: jsMatch[4]
        };
      }
      if (pyMatch) {
        return {
          frame: index + 1,
          functionName: pyMatch[3],
          file: pyMatch[1],
          line: pyMatch[2],
          column: "-"
        };
      }
      return { frame: index + 1, functionName: line, file: "-", line: "-", column: "-" };
    });
}

export function prettifyLog(input) {
  return normalizeText(input)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.stringify(JSON.parse(line), null, 2);
      } catch {
        return line
          .split(/\s+/)
          .map((chunk) => (chunk.includes("=") ? chunk.replace("=", ": ") : chunk))
          .join("\n");
      }
    })
    .join("\n\n");
}

export function estimateTimeComplexity(input) {
  const text = normalizeText(input).toLowerCase();
  const loops = (text.match(/\b(for|while|foreach)\b/g) || []).length;
  const recursion = /return\s+\w+\(/.test(text);
  if (loops >= 2) return { complexity: "O(n^2)", reason: "Nested or repeated loop patterns were detected." };
  if (loops === 1 && recursion) return { complexity: "O(n log n)", reason: "A loop and recursive-looking call both appear in the snippet." };
  if (loops === 1) return { complexity: "O(n)", reason: "A single loop-like structure was detected." };
  if (recursion) return { complexity: "O(log n)", reason: "The code looks recursive without an obvious loop." };
  return { complexity: "O(1)", reason: "No loop-like pattern was detected." };
}

export function estimateMemoryUsage(itemCount, averageBytes, overheadRatio = 0.2) {
  const count = Math.max(0, Number(itemCount) || 0);
  const bytes = Math.max(0, Number(averageBytes) || 0);
  const overhead = Math.max(0, Number(overheadRatio) || 0);
  const total = count * bytes * (1 + overhead);
  return {
    bytes: total,
    kb: total / 1024,
    mb: total / (1024 * 1024)
  };
}

export function explainCode(input) {
  const text = normalizeText(input);
  const lines = text.split("\n").filter((line) => line.trim());
  const functionCount = (text.match(/\b(function|def|class)\b/g) || []).length;
  const loopCount = (text.match(/\b(for|while|foreach)\b/g) || []).length;
  const conditionCount = (text.match(/\b(if|else if|switch|case)\b/g) || []).length;
  return [
    `This snippet has ${lines.length} non-empty lines.`,
    functionCount ? `It defines or references ${functionCount} function or class blocks.` : "It does not appear to define functions or classes.",
    loopCount ? `It contains ${loopCount} loop-like structures.` : "It does not contain obvious loops.",
    conditionCount ? `It uses ${conditionCount} conditional branches.` : "It does not contain obvious conditional branching."
  ].join(" ");
}

export function buildApiRequestPreview({ method, url, headers, body }) {
  const parsedHeaders = normalizeText(headers)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((accumulator, line) => {
      const [key, ...rest] = line.split(":");
      accumulator[key.trim()] = rest.join(":").trim();
      return accumulator;
    }, {});
  return {
    requestSummary: `${method} ${url}`,
    curl: `curl -X ${method} "${url}"${Object.entries(parsedHeaders)
      .map(([key, value]) => ` -H "${key}: ${value}"`)
      .join("")}${body.trim() ? ` --data '${body}'` : ""}`,
    fetch: `fetch("${url}", {\n  method: "${method}",\n  headers: ${JSON.stringify(parsedHeaders, null, 2)},\n  body: ${body.trim() ? JSON.stringify(body) : "undefined"}\n});`
  };
}

export function buildOpenApiSpec({ title, version, baseUrl, endpoints }) {
  const paths = normalizeText(endpoints)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [method = "get", path = "/", ...rest] = line.split(/\s+/);
      return { method: method.toLowerCase(), path, summary: rest.join(" ") || "Generated endpoint" };
    });
  return [
    "openapi: 3.0.3",
    `info:\n  title: ${title || "Generated API"}\n  version: ${version || "1.0.0"}`,
    `servers:\n  - url: ${baseUrl || "https://api.example.com"}`,
    "paths:",
    ...paths.flatMap((endpoint) => [
      `  ${endpoint.path}:`,
      `    ${endpoint.method}:`,
      `      summary: ${endpoint.summary}`,
      "      responses:",
      "        '200':",
      "          description: Success"
    ])
  ].join("\n");
}

export function buildReadme({ name, description, install, usage, features }) {
  return `# ${name || "Project Name"}\n\n${description || "Short project description."}\n\n## Features\n${normalizeText(features || "- Fast\n- Clear\n- Browser-only")}\n\n## Installation\n\`\`\`bash\n${install || "npm install"}\n\`\`\`\n\n## Usage\n\`\`\`bash\n${usage || "npm run dev"}\n\`\`\``;
}

export function buildDependencyGraph(input) {
  const edges = normalizeText(input)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("->").map((part) => part.trim()))
    .filter((parts) => parts.length === 2);
  return `graph TD\n${edges.map(([from, to]) => `  ${from.replace(/\W+/g, "_")}["${from}"] --> ${to.replace(/\W+/g, "_")}["${to}"]`).join("\n")}`;
}

export function buildArchitectureDiagram(input) {
  const edges = normalizeText(input)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("->").map((part) => part.trim()))
    .filter((parts) => parts.length === 2);
  return `flowchart LR\n${edges.map(([from, to]) => `  ${from.replace(/\W+/g, "_")}["${from}"] --> ${to.replace(/\W+/g, "_")}["${to}"]`).join("\n")}`;
}

export function parseSqlSchemaToOrm(input, target = "prisma") {
  const match = normalizeText(input).match(/CREATE\s+TABLE\s+([a-zA-Z0-9_]+)\s*\(([\s\S]+)\)/i);
  if (!match) return "Enter a simple CREATE TABLE statement.";
  const [, rawTableName, rawColumns] = match;
  const columns = rawColumns
    .split(",")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, type] = line.split(/\s+/);
      return { name, type: (type || "").toUpperCase() };
    });
  if (target === "sqlalchemy") {
    return `class ${rawTableName[0].toUpperCase()}${rawTableName.slice(1)}(Base):\n  __tablename__ = "${rawTableName}"\n${columns
      .map((column) => `  ${column.name} = Column(${column.type.includes("INT") ? "Integer" : "String"})`)
      .join("\n")}`;
  }
  return `model ${rawTableName[0].toUpperCase()}${rawTableName.slice(1)} {\n${columns
    .map((column) => `  ${column.name} ${column.type.includes("INT") ? "Int" : "String"}`)
    .join("\n")}\n}`;
}

const comparisonDatasets = {
  language: {
    javascript: { runtime: "Browser + Node.js", typing: "Dynamic", bestFor: "Web apps", learningCurve: "Low" },
    python: { runtime: "Interpreter", typing: "Dynamic", bestFor: "Scripting + data", learningCurve: "Low" },
    typescript: { runtime: "Browser + Node.js", typing: "Static", bestFor: "Large web apps", learningCurve: "Medium" },
    go: { runtime: "Compiled", typing: "Static", bestFor: "Services + CLIs", learningCurve: "Medium" }
  },
  framework: {
    react: { type: "UI library", bestFor: "Interactive apps", dataLayer: "Flexible", learningCurve: "Medium" },
    vue: { type: "Framework", bestFor: "Approachable SPAs", dataLayer: "Built-in patterns", learningCurve: "Low" },
    svelte: { type: "Compiler", bestFor: "Lean UIs", dataLayer: "Simple stores", learningCurve: "Low" },
    nextjs: { type: "Meta-framework", bestFor: "Full-stack React", dataLayer: "Opinionated", learningCurve: "Medium" }
  },
  database: {
    postgres: { model: "Relational", strengths: "Consistency + SQL", scaling: "Vertical + replicas", bestFor: "General apps" },
    mysql: { model: "Relational", strengths: "Broad hosting support", scaling: "Vertical + replicas", bestFor: "Traditional web apps" },
    sqlite: { model: "Embedded", strengths: "No server", scaling: "Single file", bestFor: "Local apps + prototypes" },
    mongodb: { model: "Document", strengths: "Flexible schema", scaling: "Horizontal", bestFor: "Document-heavy apps" }
  }
};

export function compareTechnology(type, choices) {
  const dataset = comparisonDatasets[type] || {};
  return choices
    .filter(Boolean)
    .map((choice) => ({ name: choice, ...(dataset[choice] || {}) }));
}
