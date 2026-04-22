function stripOuterParens(value) {
  let text = String(value ?? "").trim();
  while (text.startsWith("(") && text.endsWith(")")) {
    let depth = 0;
    let balanced = true;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if (depth === 0 && index < text.length - 1) {
        balanced = false;
        break;
      }
    }
    if (!balanced) break;
    text = text.slice(1, -1).trim();
  }
  return text;
}

function splitTopLevel(value, separators) {
  const parts = [];
  let current = "";
  let quote = null;
  let escaped = false;
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (quote) {
      current += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (depth === 0) {
      const match = separators.find((separator) => value.startsWith(separator, index));
      if (match) {
        parts.push(current.trim());
        current = "";
        index += match.length - 1;
        continue;
      }
    }

    current += char;
  }

  parts.push(current.trim());
  return parts.filter(Boolean);
}

function tokenizeLispArgs(value) {
  const tokens = [];
  let current = "";
  let quote = null;
  let escaped = false;
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (quote) {
      current += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (depth === 0 && /\s/.test(char)) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

function normalizeVariableName(raw, language) {
  const value = String(raw ?? "").trim();
  if (!value) return value;
  if (language === "basic") return value.toUpperCase();
  return value.replace(/^[${]+/, "").replace(/[}]$/, "").replace(/^\$/, "").trim();
}

function interpolateVariables(text, vars, language) {
  const replacedShell = text.replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (_, name) => String(vars[normalizeVariableName(name, language)] ?? ""));
  if (language === "ruby") {
    return replacedShell.replace(/#\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name) => String(vars[normalizeVariableName(name, language)] ?? ""));
  }
  return replacedShell;
}

function parseStringLiteral(value, vars, language) {
  const text = String(value ?? "").trim();
  const quote = text[0];
  if (!((quote === '"' || quote === "'") && text.endsWith(quote))) return null;

  let inner = text.slice(1, -1);
  inner = inner
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");

  if (quote === '"' && ["bash", "powershell", "perl", "ruby"].includes(language)) {
    return interpolateVariables(inner, vars, language);
  }

  return inner;
}

function parseNumberLiteral(value) {
  const text = String(value ?? "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

function lookupVariable(value, vars, language) {
  const key = normalizeVariableName(value, language);
  if (Object.prototype.hasOwnProperty.call(vars, key)) {
    return vars[key];
  }
  return undefined;
}

function joinValues(parts) {
  if (parts.every((item) => typeof item === "number")) {
    return parts.reduce((sum, item) => sum + item, 0);
  }
  return parts.map((item) => String(item ?? "")).join("");
}

const concatOperators = {
  php: ["."],
  perl: ["."],
  lua: [".."],
  vbscript: ["&"],
  bash: ["+"],
  powershell: ["+"],
  matlab: ["+"],
  python: ["+"],
  ruby: ["+"],
  basic: ["+"],
  javascript: ["+"]
};

function evaluateExpression(value, language, vars) {
  const raw = stripOuterParens(String(value ?? "").trim().replace(/;$/, "").trim());
  if (!raw) return "";

  if (language === "r" && /^paste\s*\(([\s\S]+)\)$/i.test(raw)) {
    const inner = raw.match(/^paste\s*\(([\s\S]+)\)$/i)[1];
    return splitTopLevel(inner, [","]).map((part) => evaluateExpression(part, language, vars)).join(" ");
  }

  if (language === "lisp" && /^(?:\(?\s*)concatenate\s+'string\s+([\s\S]+?)(?:\s*\)?)$/i.test(raw)) {
    const inner = raw.match(/^(?:\(?\s*)concatenate\s+'string\s+([\s\S]+?)(?:\s*\)?)$/i)[1];
    return tokenizeLispArgs(inner).map((token) => evaluateExpression(token, language, vars)).join("");
  }

  const operators = concatOperators[language] || [];
  const concatParts = operators.length ? splitTopLevel(raw, operators) : [raw];
  if (concatParts.length > 1) {
    return joinValues(concatParts.map((part) => evaluateExpression(part, language, vars)));
  }

  const stringValue = parseStringLiteral(raw, vars, language);
  if (stringValue !== null) return stringValue;

  const numberValue = parseNumberLiteral(raw);
  if (numberValue !== null) return numberValue;

  const variableValue = lookupVariable(raw, vars, language);
  if (variableValue !== undefined) return variableValue;

  if (language === "basic" && raw.endsWith("$")) {
    return String(vars[normalizeVariableName(raw, language)] ?? "");
  }

  return raw;
}

function parseStatement(line, language) {
  const value = String(line ?? "").trim();
  if (!value) return null;

  switch (language) {
    case "python": {
      const assign = value.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = value.match(/^print\s*\(([\s\S]+)\)$/);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    case "php": {
      const assign = value.match(/^\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?);?$/);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = value.match(/^(?:echo|print)\s+(.+?);?$/i);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    case "ruby": {
      const assign = value.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = value.match(/^puts\s+(.+)$/);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    case "perl": {
      const assign = value.match(/^(?:my\s+)?\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?);?$/);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = value.match(/^print\s+(.+?);?$/);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    case "r": {
      const assign = value.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*<-\s*(.+)$/);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = value.match(/^print\s*\(([\s\S]+)\)$/);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    case "lua": {
      const assign = value.match(/^(?:local\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = value.match(/^print\s*\(([\s\S]+)\)$/);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    case "matlab": {
      const assign = value.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?);?$/);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = value.match(/^disp\s*\(([\s\S]+)\)\s*;?$/i);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    case "lisp": {
      const assign = value.match(/^\(setq\s+([A-Za-z_][A-Za-z0-9_-]*)\s+([\s\S]+)\)$/i);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = value.match(/^\(print\s+([\s\S]+)\)$/i);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    case "basic": {
      const withoutNumber = value.replace(/^\d+\s+/, "");
      const assign = withoutNumber.match(/^(?:LET\s+)?([A-Za-z_][A-Za-z0-9_]*\$?)\s*=\s*(.+)$/i);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = withoutNumber.match(/^PRINT\s+(.+)$/i);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    case "bash": {
      if (value.startsWith("#!")) return { type: "noop" };
      const assign = value.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = value.match(/^echo\s+(.+)$/);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    case "powershell": {
      const assign = value.match(/^\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = value.match(/^Write-Output\s+(.+)$/i);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    case "vbscript": {
      if (/^Dim\s+[A-Za-z_][A-Za-z0-9_]*$/i.test(value)) return { type: "noop" };
      const assign = value.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i);
      if (assign) return { type: "assign", name: assign[1], expression: assign[2] };
      const print = value.match(/^WScript\.Echo\s+(.+)$/i);
      if (print) return { type: "print", expression: print[1] };
      break;
    }
    default:
      break;
  }

  return { type: "unsupported", source: value };
}

export function runLightIdeCode(language, code) {
  const vars = {};
  const outputs = [];
  const lines = String(code ?? "")
    .replace(/<\?php/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const statement = parseStatement(line, language);
    if (!statement || statement.type === "noop") continue;

    if (statement.type === "assign") {
      vars[normalizeVariableName(statement.name, language)] = evaluateExpression(statement.expression, language, vars);
      continue;
    }

    if (statement.type === "print") {
      outputs.push(String(evaluateExpression(statement.expression, language, vars)));
      continue;
    }

    return {
      ok: false,
      output: `Unsupported ${language} statement in lightweight browser runner: ${statement.source}`
    };
  }

  return {
    ok: true,
    output: outputs.filter(Boolean).join("\n") || "Code ran with no output."
  };
}

export function runJavaScriptSnippet(code) {
  const logs = [];
  const consoleLike = {
    log: (...args) => logs.push(args.map((item) => String(item)).join(" ")),
    error: (...args) => logs.push(args.map((item) => String(item)).join(" "))
  };

  try {
    const result = new Function("console", code)(consoleLike);
    return {
      ok: true,
      output: [...logs, result === undefined ? "" : String(result)].filter(Boolean).join("\n") || "Code ran with no output."
    };
  } catch (error) {
    return {
      ok: false,
      output: error.message
    };
  }
}
