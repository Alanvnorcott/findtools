function normalizeText(value) {
  return String(value ?? "").replace(/\r\n/g, "\n");
}

function indentBlockLines(lines, openingPattern, closingPattern) {
  let depth = 0;
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      if (closingPattern.test(line)) depth = Math.max(0, depth - 1);
      const formatted = `${"  ".repeat(depth)}${line}`;
      if (openingPattern.test(line) && !closingPattern.test(line)) depth += 1;
      return formatted;
    })
    .join("\n");
}

function tokenizeBraceLanguage(input) {
  return normalizeText(input)
    .replace(/([{};])/g, "\n$1\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatBraceLanguage(input) {
  const tokens = tokenizeBraceLanguage(input);
  let depth = 0;
  const lines = [];

  for (const token of tokens) {
    if (token === "}") depth = Math.max(0, depth - 1);
    if (token === ";") {
      const last = lines.pop() || "";
      lines.push(`${last};`);
      continue;
    }
    if (token === "{") {
      const last = lines.pop() || "";
      lines.push(`${last} {`);
      depth += 1;
      continue;
    }
    lines.push(`${"  ".repeat(depth)}${token}`);
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function minifyBraceLanguage(input) {
  return normalizeText(input)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}();,:=<>+\-*/])\s*/g, "$1")
    .trim();
}

function formatPython(input) {
  const lines = normalizeText(input)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  let depth = 0;
  return lines
    .map((line) => {
      if (/^(elif|else|except|finally)\b/.test(line)) depth = Math.max(0, depth - 1);
      const formatted = `${"  ".repeat(depth)}${line}`;
      if (line.endsWith(":")) depth += 1;
      return formatted;
    })
    .join("\n");
}

function minifyPython(input) {
  return normalizeText(input)
    .split("\n")
    .map((line) => line.replace(/#.*$/, "").trimEnd())
    .filter((line) => line.trim())
    .join("\n");
}

function parseSimpleYaml(input) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  normalizeText(input)
    .split("\n")
    .forEach((line) => {
      if (!line.trim() || line.trim().startsWith("#")) return;
      const indent = line.match(/^ */)?.[0].length || 0;
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      const parent = stack[stack.length - 1].value;
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        if (!Array.isArray(parent.items)) parent.items = [];
        parent.items.push(trimmed.slice(2).trim());
        return;
      }
      const [rawKey, ...rest] = trimmed.split(":");
      const key = rawKey.trim();
      const rawValue = rest.join(":").trim();
      if (!key) throw new Error("Missing YAML key.");
      if (!rawValue) {
        parent[key] = {};
        stack.push({ indent, value: parent[key] });
        return;
      }
      if (rawValue === "true" || rawValue === "false") parent[key] = rawValue === "true";
      else if (!Number.isNaN(Number(rawValue)) && rawValue !== "") parent[key] = Number(rawValue);
      else parent[key] = rawValue.replace(/^['"]|['"]$/g, "");
    });
  return root;
}

function toSimpleYaml(value, depth = 0) {
  const indent = "  ".repeat(depth);
  if (Array.isArray(value)) {
    return value
      .map((item) => `${indent}- ${typeof item === "object" ? JSON.stringify(item) : item}`)
      .join("\n");
  }
  return Object.entries(value || {})
    .map(([key, item]) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return `${indent}${key}:\n${toSimpleYaml(item, depth + 1)}`;
      }
      return `${indent}${key}: ${item}`;
    })
    .join("\n");
}

function formatXmlText(input) {
  const compact = normalizeText(input).replace(/>\s+</g, "><");
  const parts = compact.split(/(?=<)|(?<=>)/g).filter(Boolean);
  let depth = 0;
  return parts
    .map((part) => {
      if (part.startsWith("</")) depth = Math.max(0, depth - 1);
      const line = `${"  ".repeat(depth)}${part}`;
      if (/^<[^!?/][^>]*[^/]?>$/.test(part)) depth += 1;
      return line;
    })
    .join("\n");
}

function validateXmlText(input) {
  const value = normalizeText(input).trim();
  if (!value) return { valid: false, errors: ["XML input is empty."] };
  const tagPattern = /<\/?([A-Za-z_][\w:.-]*)(?:\s[^<>]*?)?\/?>/g;
  const stack = [];
  let match;
  while ((match = tagPattern.exec(value))) {
    const token = match[0];
    const name = match[1];
    if (token.startsWith("<?") || token.startsWith("<!") || token.endsWith("/>")) continue;
    if (token.startsWith("</")) {
      const expected = stack.pop();
      if (expected !== name) {
        return { valid: false, errors: [`Unexpected closing tag </${name}>.`] };
      }
    } else {
      stack.push(name);
    }
  }
  if (stack.length) {
    return { valid: false, errors: [`Missing closing tag for <${stack[stack.length - 1]}>.`] };
  }
  return { valid: true, errors: [] };
}

function formatSqlText(value) {
  return normalizeText(value)
    .replace(/\s+/g, " ")
    .replace(
      /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|CREATE TABLE|ALTER TABLE)\b/gi,
      "\n$1"
    )
    .trim();
}

function minifySqlText(value) {
  return normalizeText(value).replace(/\s+/g, " ").trim();
}

function validateSqlText(value) {
  const text = normalizeText(value).trim();
  if (!text) return { valid: false, errors: ["SQL input is empty."] };
  const upper = text.toUpperCase();
  const looksLikeQuery = ["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP"].some((keyword) =>
    upper.includes(keyword)
  );
  const parenCount = [...text].reduce((count, char) => count + (char === "(" ? 1 : char === ")" ? -1 : 0), 0);
  const errors = [];
  if (!looksLikeQuery) errors.push("No recognizable SQL command was found.");
  if (parenCount !== 0) errors.push("Parentheses are unbalanced.");
  return { valid: errors.length === 0, errors };
}

function parseJsonSafely(input) {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function toPascalCase(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function inferSchema(value) {
  if (Array.isArray(value)) {
    return { kind: "array", item: inferSchema(value[0]) || { kind: "any" } };
  }
  if (value === null) return { kind: "any" };
  switch (typeof value) {
    case "string":
      return { kind: "string" };
    case "number":
      return { kind: Number.isInteger(value) ? "integer" : "number" };
    case "boolean":
      return { kind: "boolean" };
    case "object":
      return {
        kind: "object",
        fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, inferSchema(item)]))
      };
    default:
      return { kind: "any" };
  }
}

function renderSchema(schema, language, name = "RootModel", registry = []) {
  const className = toPascalCase(name || "RootModel");
  if (schema.kind === "object") {
    const nested = [];
    const fields = Object.entries(schema.fields).map(([field, value]) => {
      const nestedName = `${className}${toPascalCase(field)}`;
      if (value.kind === "object") {
        nested.push(renderSchema(value, language, nestedName, registry));
      }
      const typeName = renderType(value, language, nestedName);
      return renderField(field, typeName, language);
    });
    const output = renderModel(className, fields, language);
    registry.push(...nested, output);
    return output;
  }
  registry.push(renderModel(className, [renderField("value", renderType(schema, language, className), language)], language));
  return registry[registry.length - 1];
}

function renderType(schema, language, nestedName) {
  const mapping = {
    string: { typescript: "string", csharp: "string", python: "str" },
    integer: { typescript: "number", csharp: "int", python: "int" },
    number: { typescript: "number", csharp: "double", python: "float" },
    boolean: { typescript: "boolean", csharp: "bool", python: "bool" },
    any: { typescript: "unknown", csharp: "object", python: "Any" }
  };
  if (schema.kind === "object") {
    return toPascalCase(nestedName);
  }
  if (schema.kind === "array") {
    const itemType = renderType(schema.item, language, nestedName);
    if (language === "csharp") return `List<${itemType}>`;
    if (language === "python") return `list[${itemType}]`;
    return `${itemType}[]`;
  }
  return mapping[schema.kind]?.[language] || "unknown";
}

function renderField(fieldName, typeName, language) {
  if (language === "csharp") return `public ${typeName} ${toPascalCase(fieldName)} { get; set; }`;
  if (language === "python") return `${fieldName}: ${typeName}`;
  return `${fieldName}: ${typeName};`;
}

function renderModel(className, fields, language) {
  if (language === "csharp") {
    return `public class ${className}\n{\n${fields.map((field) => `  ${field}`).join("\n")}\n}`;
  }
  if (language === "python") {
    return `@dataclass\nclass ${className}:\n${fields.length ? fields.map((field) => `  ${field}`).join("\n") : "  pass"}`;
  }
  return `interface ${className} {\n${fields.map((field) => `  ${field}`).join("\n")}\n}`;
}

function jsonToModel(input, language) {
  const parsed = parseJsonSafely(input);
  if (!parsed.ok) return `Invalid JSON: ${parsed.error}`;
  const registry = [];
  const schema = inferSchema(parsed.value);
  renderSchema(schema, language, "RootModel", registry);
  const unique = [...new Map(registry.map((item) => [item.split("\n")[0], item])).values()];
  const prefix = language === "python" ? "from dataclasses import dataclass\nfrom typing import Any\n\n" : language === "csharp" ? "using System.Collections.Generic;\n\n" : "";
  return `${prefix}${unique.join("\n\n")}`.trim();
}

function pseudocodeToCode(input, language) {
  const lines = normalizeText(input)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (language === "python") {
    let depth = 0;
    return lines
      .map((line) => {
        const upper = line.toUpperCase();
        if (/^(ELSE|ELIF|END IF|END FOR|END WHILE)/.test(upper)) depth = Math.max(0, depth - 1);
        if (/^END /.test(upper)) return null;
        let output = line
          .replace(/^SET\s+/i, "")
          .replace(/^RETURN\s+/i, "return ")
          .replace(/^PRINT\s+/i, "print(")
          .replace(/^IF\s+(.+)\s+THEN$/i, "if $1:")
          .replace(/^ELSE$/i, "else:")
          .replace(/^ELSE IF\s+(.+)\s+THEN$/i, "elif $1:")
          .replace(/^FOR EACH\s+(\w+)\s+IN\s+(.+)$/i, "for $1 in $2:")
          .replace(/^WHILE\s+(.+)$/i, "while $1:");
        if (output.startsWith("print(") && !output.endsWith(")")) output += ")";
        if (output.endsWith(";")) output = output.slice(0, -1) + ":";
        const formatted = `${"  ".repeat(depth)}${output}`;
        if (/:\s*$/.test(output)) depth += 1;
        return formatted;
      })
      .filter(Boolean)
      .join("\n");
  }

  let depth = 0;
  return lines
    .map((line) => {
      const upper = line.toUpperCase();
      if (/^(ELSE|ELSE IF|END IF|END FOR|END WHILE)/.test(upper)) depth = Math.max(0, depth - 1);
      if (/^END /.test(upper)) return `${"  ".repeat(depth)}}`;
      if (/^ELSE IF\s+(.+)\s+THEN$/i.test(line)) return `${"  ".repeat(depth)}} else if (${line.match(/^ELSE IF\s+(.+)\s+THEN$/i)[1]}) {`;
      if (/^ELSE$/i.test(line)) return `${"  ".repeat(depth)}} else {`;
      if (/^IF\s+(.+)\s+THEN$/i.test(line)) {
        const text = `${"  ".repeat(depth)}if (${line.match(/^IF\s+(.+)\s+THEN$/i)[1]}) {`;
        depth += 1;
        return text;
      }
      if (/^FOR EACH\s+(\w+)\s+IN\s+(.+)$/i.test(line)) {
        const [, item, list] = line.match(/^FOR EACH\s+(\w+)\s+IN\s+(.+)$/i);
        const text = `${"  ".repeat(depth)}for (const ${item} of ${list}) {`;
        depth += 1;
        return text;
      }
      if (/^WHILE\s+(.+)$/i.test(line)) {
        const text = `${"  ".repeat(depth)}while (${line.match(/^WHILE\s+(.+)$/i)[1]}) {`;
        depth += 1;
        return text;
      }
      const output = line
        .replace(/^SET\s+/i, "")
        .replace(/^RETURN\s+/i, "return ")
        .replace(/^PRINT\s+/i, "console.log(");
      return `${"  ".repeat(depth)}${output.startsWith("console.log(") && !output.endsWith(")") ? `${output})` : output};`;
    })
    .join("\n");
}

export const codingLanguageRegistry = {
  javascript: {
    name: "javascript",
    label: "JavaScript",
    supports: ["format", "minify", "validate", "transform"],
    formatter: formatBraceLanguage,
    minifier: minifyBraceLanguage,
    validator: (input) => ({ valid: input.trim().length > 0, errors: input.trim() ? [] : ["JavaScript input is empty."] })
  },
  typescript: {
    name: "typescript",
    label: "TypeScript",
    supports: ["format", "minify", "validate", "transform"],
    formatter: formatBraceLanguage,
    minifier: minifyBraceLanguage,
    validator: (input) => ({ valid: input.trim().length > 0, errors: input.trim() ? [] : ["TypeScript input is empty."] })
  },
  python: {
    name: "python",
    label: "Python",
    supports: ["format", "minify", "validate", "transform"],
    formatter: formatPython,
    minifier: minifyPython,
    validator: (input) => ({ valid: input.trim().length > 0, errors: input.trim() ? [] : ["Python input is empty."] })
  },
  json: {
    name: "json",
    label: "JSON",
    supports: ["format", "minify", "validate"],
    formatter: (input) => {
      const parsed = parseJsonSafely(input);
      return parsed.ok ? JSON.stringify(parsed.value, null, 2) : `Invalid JSON: ${parsed.error}`;
    },
    minifier: (input) => {
      const parsed = parseJsonSafely(input);
      return parsed.ok ? JSON.stringify(parsed.value) : `Invalid JSON: ${parsed.error}`;
    },
    validator: (input) => {
      const parsed = parseJsonSafely(input);
      return { valid: parsed.ok, errors: parsed.ok ? [] : [parsed.error] };
    }
  },
  html: {
    name: "html",
    label: "HTML",
    supports: ["format", "minify", "validate"],
    formatter: formatXmlText,
    minifier: (input) => normalizeText(input).replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim(),
    validator: validateXmlText
  },
  css: {
    name: "css",
    label: "CSS",
    supports: ["format", "minify", "validate"],
    formatter: formatBraceLanguage,
    minifier: (input) =>
      normalizeText(input).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,])\s*/g, "$1").trim(),
    validator: (input) => ({ valid: input.includes("{") && input.includes("}"), errors: input.includes("{") && input.includes("}") ? [] : ["CSS must include braces."] })
  },
  sql: {
    name: "sql",
    label: "SQL",
    supports: ["format", "minify", "validate"],
    formatter: formatSqlText,
    minifier: minifySqlText,
    validator: validateSqlText
  },
  yaml: {
    name: "yaml",
    label: "YAML",
    supports: ["format", "validate"],
    formatter: (input) => {
      try {
        return toSimpleYaml(parseSimpleYaml(input));
      } catch (error) {
        return `Invalid YAML: ${error.message}`;
      }
    },
    validator: (input) => {
      try {
        parseSimpleYaml(input);
        return { valid: true, errors: [] };
      } catch (error) {
        return { valid: false, errors: [error.message] };
      }
    }
  },
  xml: {
    name: "xml",
    label: "XML",
    supports: ["format", "validate"],
    formatter: formatXmlText,
    validator: validateXmlText
  },
  csharp: {
    name: "csharp",
    label: "C#",
    supports: ["transform"]
  }
};

export function getSupportedLanguages(capability) {
  return Object.values(codingLanguageRegistry).filter((language) => language.supports.includes(capability));
}

export function format(code, language) {
  const handler = codingLanguageRegistry[language];
  return handler?.formatter ? handler.formatter(code) : normalizeText(code);
}

export function minify(code, language) {
  const handler = codingLanguageRegistry[language];
  return handler?.minifier ? handler.minifier(code) : normalizeText(code).replace(/\s+/g, " ").trim();
}

export function validate(code, language) {
  const handler = codingLanguageRegistry[language];
  return handler?.validator ? handler.validator(code) : { valid: code.trim().length > 0, errors: code.trim() ? [] : ["Input is empty."] };
}

export function transform(input, fromType, toType, language) {
  if (fromType === "json" && toType === "model") {
    return jsonToModel(input, language);
  }
  if (fromType === "pseudocode" && toType === "code") {
    return pseudocodeToCode(input, language);
  }
  return normalizeText(input);
}

export const codingLanguageEngine = {
  format,
  minify,
  validate,
  transform,
  getSupportedLanguages,
  registry: codingLanguageRegistry
};
