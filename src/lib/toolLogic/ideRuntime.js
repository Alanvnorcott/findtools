function stripPhpTags(code) {
  return String(code ?? "").replace(/<\?php/g, "").replace(/\?>/g, "");
}

function stripLineNumbers(line) {
  return String(line ?? "").replace(/^\s*\d+\s+/, "");
}

function normalizeIndentation(line) {
  const match = String(line ?? "").match(/^(\s*)/);
  return (match?.[1] || "").replace(/\t/g, "    ").length;
}

function splitLines(code, { stripBasicNumbers = false } = {}) {
  return String(code ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (stripBasicNumbers ? stripLineNumbers(line) : line));
}

function indent(level) {
  return "  ".repeat(level);
}

function normalizeCondition(condition, language) {
  let value = String(condition ?? "").trim();
  if (!value) return "true";

  if (language === "bash") {
    value = value
      .replace(/^\[\s*/, "")
      .replace(/\s*\]$/, "")
      .replace(/-eq/g, "===")
      .replace(/-ne/g, "!==")
      .replace(/-lt/g, "<")
      .replace(/-le/g, "<=")
      .replace(/-gt/g, ">")
      .replace(/-ge/g, ">=")
      .replace(/-a/g, "&&")
      .replace(/-o/g, "||");
  }

  value = value
    .replace(/\band\b/g, "&&")
    .replace(/\bor\b/g, "||")
    .replace(/\bnot\b/g, "!")
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null")
    .replace(/\bnil\b/g, "null")
    .replace(/\bNULL\b/g, "null")
    .replace(/\btrue\b/g, "true")
    .replace(/\bfalse\b/g, "false")
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, "$1")
    .replace(/<>/g, "!==")
    .replace(/\bEQ\b/gi, "===")
    .replace(/\bNE\b/gi, "!==")
    .replace(/\bAND\b/gi, "&&")
    .replace(/\bOR\b/gi, "||")
    .replace(/\bNOT\b/gi, "!")
    .replace(/\s=\s/g, " === ");

  return value;
}

function normalizeExpression(expression, language) {
  let value = String(expression ?? "").trim().replace(/;$/, "");
  if (!value) return '""';

  value = value
    .replace(/\$([1-9]\d*)/g, (_, digit) => `__args[${Number(digit) - 1}]`)
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, "$1")
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null")
    .replace(/\bnil\b/g, "null")
    .replace(/\bNULL\b/g, "null")
    .replace(/\bNothing\b/gi, "null")
    .replace(/\band\b/g, "&&")
    .replace(/\bor\b/g, "||")
    .replace(/\bnot\b/g, "!")
    .replace(/\bmod\b/gi, "%")
    .replace(/\bLen\s*\(/gi, "len(")
    .replace(/\blen\s*\(\s*([^)]+)\)/g, "($1).length")
    .replace(/\bc\(([^()]*)\)/g, "[$1]")
    .replace(/\bpaste\s*\(([^()]*)\)/gi, "[$1].join(\" \")")
    .replace(/\bstr\s*\(([^()]*)\)/g, "String($1)")
    .replace(/\bint\s*\(([^()]*)\)/g, "Math.trunc($1)")
    .replace(/\bfloat\s*\(([^()]*)\)/g, "Number($1)")
    .replace(/\bRound\s*\(([^()]*)\)/gi, "Math.round($1)")
    .replace(/\bLCase\s*\(([^()]*)\)/gi, "String($1).toLowerCase()")
    .replace(/\bUCase\s*\(([^()]*)\)/gi, "String($1).toUpperCase()")
    .replace(/\.\./g, "+")
    .replace(/\s\.\s/g, " + ")
    .replace(/\s&\s/g, " + ");

  if (language === "powershell") {
    value = value
      .replace(/-eq/g, "===")
      .replace(/-ne/g, "!==")
      .replace(/-lt/g, "<")
      .replace(/-le/g, "<=")
      .replace(/-gt/g, ">")
      .replace(/-ge/g, ">=")
      .replace(/-and/g, "&&")
      .replace(/-or/g, "||")
      .replace(/-not/g, "!");
  }

  if (language === "r" || language === "matlab") {
    value = value.replace(/(\d+)\s*:\s*(\d+)/g, "Array.from({ length: ($2 - $1) + 1 }, (_, __i) => $1 + __i)");
  }

  return value;
}

function translatePrint(expression, language) {
  if (language === "bash") {
    const raw = String(expression ?? "").trim();
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      const inner = raw.slice(1, -1)
        .replace(/`/g, "\\`")
        .replace(/\$([1-9]\d*)/g, (_, digit) => `\${__args[${Number(digit) - 1}] ?? ""}`)
        .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => `\${${name} ?? ""}`);
      return `console.log(\`${inner}\`);`;
    }
  }
  return `console.log(${normalizeExpression(expression, language)});`;
}

function buildRangeLoop(variable, startValue, endValue, stepValue = "1", inclusive = true) {
  const varName = variable.replace(/^\$/, "");
  const step = Number(stepValue);
  const comparator = step < 0 ? (inclusive ? ">=" : ">") : (inclusive ? "<=" : "<");
  const increment = step < 0 ? `${varName} -= ${Math.abs(step)}` : `${varName} += ${Math.abs(step)}`;
  return `for (var ${varName} = ${startValue}; ${varName} ${comparator} ${endValue}; ${increment}) {`;
}

function splitArgsPreservingQuotes(value) {
  const parts = [];
  let current = "";
  let quote = null;

  for (const char of String(value ?? "")) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.trim()) {
        parts.push(current.trim());
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function countLeadingSpaces(line) {
  return (String(line ?? "").match(/^(\s*)/)?.[1] || "").length;
}

function isStatementLine(trimmed) {
  if (!trimmed || trimmed === "{" || trimmed === "}") return false;
  if (/^else\b/.test(trimmed)) return false;
  if (/^catch\b/.test(trimmed)) return false;
  if (/^finally\b/.test(trimmed)) return false;
  return trimmed.endsWith(";") || trimmed.startsWith("return ");
}

function runtimeGuardPrelude() {
  return [
    "const __runtimeGuard = {",
    "  steps: 0,",
    "  loopIterations: 0,",
    "  functionDepth: 0,",
    "  maxSteps: 25000,",
    "  maxLoopIterations: 6000,",
    "  maxFunctionDepth: 80",
    "};",
    "function __guardStep() {",
    "  __runtimeGuard.steps += 1;",
    "  if (__runtimeGuard.steps > __runtimeGuard.maxSteps) {",
    '    throw new Error("Execution stopped: the snippet exceeded the safe operation limit. Add an end condition or reduce the input size.");',
    "  }",
    "}",
    "function __guardLoop() {",
    "  __guardStep();",
    "  __runtimeGuard.loopIterations += 1;",
    "  if (__runtimeGuard.loopIterations > __runtimeGuard.maxLoopIterations) {",
    '    throw new Error("Execution stopped: the loop exceeded the safe iteration limit. Add a base case or tighter bounds.");',
    "  }",
    "}",
    "function __enterFunction() {",
    "  __guardStep();",
    "  __runtimeGuard.functionDepth += 1;",
    "  if (__runtimeGuard.functionDepth > __runtimeGuard.maxFunctionDepth) {",
    '    throw new Error("Execution stopped: the call stack exceeded the safe recursion depth. Add a base case.");',
    "  }",
    "}",
    "function __exitFunction() {",
    "  __runtimeGuard.functionDepth = Math.max(0, __runtimeGuard.functionDepth - 1);",
    "}"
  ];
}

function instrumentTranspiledJavaScript(jsCode) {
  const lines = String(jsCode ?? "").split("\n");
  const output = [...runtimeGuardPrelude()];
  const blockStack = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const indentation = countLeadingSpaces(line);
    const currentIndent = " ".repeat(indentation);

    if (/^function\s+/.test(trimmed) && trimmed.endsWith("{")) {
      output.push(line);
      output.push(`${currentIndent}  __enterFunction();`);
      blockStack.push({ type: "function", indent: indentation });
      continue;
    }

    if (/^(?:for|while)\b/.test(trimmed) && trimmed.endsWith("{")) {
      output.push(line);
      output.push(`${currentIndent}  __guardLoop();`);
      blockStack.push({ type: "loop", indent: indentation });
      continue;
    }

    if (trimmed.endsWith("{")) {
      output.push(line);
      blockStack.push({ type: "block", indent: indentation });
      continue;
    }

    if (trimmed === "}") {
      const block = blockStack.pop();
      if (block?.type === "function") {
        output.push(`${" ".repeat(block.indent + 2)}__exitFunction();`);
      }
      output.push(line);
      continue;
    }

    if (/^return\s+/.test(trimmed)) {
      const expression = trimmed.replace(/^return\s+/, "").replace(/;$/, "");
      output.push(`${currentIndent}__guardStep();`);
      output.push(`${currentIndent}const __guardedReturnValue = ${expression};`);
      output.push(`${currentIndent}__exitFunction();`);
      output.push(`${currentIndent}return __guardedReturnValue;`);
      continue;
    }

    if (isStatementLine(trimmed)) {
      output.push(`${currentIndent}__guardStep();`);
      output.push(line);
      continue;
    }

    output.push(line);
  }

  return output.join("\n");
}

function transpilePython(code) {
  const lines = splitLines(code);
  const output = [];
  const indentStack = [0];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const currentIndent = normalizeIndentation(rawLine);

    while (indentStack.length > 1 && currentIndent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
      output.push(`${indent(indentStack.length - 1)}}`);
    }

    if (/^elif\s+/.test(trimmed) || /^else\s*:/.test(trimmed)) {
      output.push(`${indent(indentStack.length - 2)}}`);
    }

    if (/^def\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\):$/.test(trimmed)) {
      const [, name, args] = trimmed.match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\):$/);
      output.push(`${indent(indentStack.length - 1)}function ${name}(${args}) {`);
      indentStack.push(currentIndent + 4);
      continue;
    }

    if (/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+range\(([^)]*)\):$/.test(trimmed)) {
      const [, variable, args] = trimmed.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+range\(([^)]*)\):$/);
      const parts = args.split(",").map((item) => normalizeExpression(item, "python"));
      const [start, end, step] = parts.length === 1 ? ["0", parts[0], "1"] : parts.length === 2 ? [parts[0], parts[1], "1"] : parts;
      output.push(`${indent(indentStack.length - 1)}${buildRangeLoop(variable, start, end, step, false)}`);
      indentStack.push(currentIndent + 4);
      continue;
    }

    if (/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+):$/.test(trimmed)) {
      const [, variable, iterable] = trimmed.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+):$/);
      output.push(`${indent(indentStack.length - 1)}for (const ${variable} of ${normalizeExpression(iterable, "python")}) {`);
      indentStack.push(currentIndent + 4);
      continue;
    }

    if (/^while\s+(.+):$/.test(trimmed)) {
      output.push(`${indent(indentStack.length - 1)}while (${normalizeCondition(trimmed.match(/^while\s+(.+):$/)[1], "python")}) {`);
      indentStack.push(currentIndent + 4);
      continue;
    }

    if (/^if\s+(.+):$/.test(trimmed)) {
      output.push(`${indent(indentStack.length - 1)}if (${normalizeCondition(trimmed.match(/^if\s+(.+):$/)[1], "python")}) {`);
      indentStack.push(currentIndent + 4);
      continue;
    }

    if (/^elif\s+(.+):$/.test(trimmed)) {
      output.push(`${indent(indentStack.length - 2)}else if (${normalizeCondition(trimmed.match(/^elif\s+(.+):$/)[1], "python")}) {`);
      indentStack.push(currentIndent + 4);
      continue;
    }

    if (/^else:$/.test(trimmed)) {
      output.push(`${indent(indentStack.length - 2)}else {`);
      indentStack.push(currentIndent + 4);
      continue;
    }

    if (/^return\b/.test(trimmed)) {
      output.push(`${indent(indentStack.length - 1)}return ${normalizeExpression(trimmed.replace(/^return\s*/, ""), "python")};`);
      continue;
    }

    if (/^print\s*\(([\s\S]+)\)$/.test(trimmed)) {
      output.push(`${indent(indentStack.length - 1)}${translatePrint(trimmed.match(/^print\s*\(([\s\S]+)\)$/)[1], "python")}`);
      continue;
    }

    if (/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.test(trimmed)) {
      const [, name, expression] = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      output.push(`${indent(indentStack.length - 1)}var ${name} = ${normalizeExpression(expression, "python")};`);
      continue;
    }

    output.push(`${indent(indentStack.length - 1)}${normalizeExpression(trimmed, "python")};`);
  }

  while (indentStack.length > 1) {
    indentStack.pop();
    output.push(`${indent(indentStack.length - 1)}}`);
  }

  return output.join("\n");
}

function transpileRuby(code) {
  const lines = splitLines(code);
  const output = [];
  const blockStack = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed === "end") {
      blockStack.pop();
      output.push(`${indent(blockStack.length)}}`);
      continue;
    }

    if (/^else$/.test(trimmed)) {
      output.push(`${indent(Math.max(blockStack.length - 1, 0))}} else {`);
      continue;
    }

    if (/^elsif\s+(.+)$/.test(trimmed)) {
      output.push(`${indent(Math.max(blockStack.length - 1, 0))}} else if (${normalizeCondition(trimmed.match(/^elsif\s+(.+)$/)[1], "ruby")}) {`);
      continue;
    }

    if (/^def\s+([A-Za-z_][A-Za-z0-9_!?]*)\s*\(?([^)]*)\)?$/.test(trimmed)) {
      const [, name, args] = trimmed.match(/^def\s+([A-Za-z_][A-Za-z0-9_!?]*)\s*\(?([^)]*)\)?$/);
      output.push(`${indent(blockStack.length)}function ${name.replace(/[!?]$/, "")}(${args}) {`);
      blockStack.push("function");
      continue;
    }

    if (/^(\d+)\.times\s+do\s+\|([A-Za-z_][A-Za-z0-9_]*)\|$/.test(trimmed)) {
      const [, count, variable] = trimmed.match(/^(\d+)\.times\s+do\s+\|([A-Za-z_][A-Za-z0-9_]*)\|$/);
      output.push(`${indent(blockStack.length)}for (var ${variable} = 0; ${variable} < ${count}; ${variable} += 1) {`);
      blockStack.push("loop");
      continue;
    }

    if (/^([A-Za-z_][A-Za-z0-9_]*)\.each\s+do\s+\|([A-Za-z_][A-Za-z0-9_]*)\|$/.test(trimmed)) {
      const [, list, variable] = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\.each\s+do\s+\|([A-Za-z_][A-Za-z0-9_]*)\|$/);
      output.push(`${indent(blockStack.length)}for (const ${variable} of ${list}) {`);
      blockStack.push("loop");
      continue;
    }

    if (/^if\s+(.+)$/.test(trimmed)) {
      output.push(`${indent(blockStack.length)}if (${normalizeCondition(trimmed.match(/^if\s+(.+)$/)[1], "ruby")}) {`);
      blockStack.push("if");
      continue;
    }

    if (/^while\s+(.+)$/.test(trimmed)) {
      output.push(`${indent(blockStack.length)}while (${normalizeCondition(trimmed.match(/^while\s+(.+)$/)[1], "ruby")}) {`);
      blockStack.push("while");
      continue;
    }

    if (/^puts\s+(.+)$/.test(trimmed)) {
      output.push(`${indent(blockStack.length)}${translatePrint(trimmed.match(/^puts\s+(.+)$/)[1], "ruby")}`);
      continue;
    }

    if (/^return\b/.test(trimmed)) {
      output.push(`${indent(blockStack.length)}return ${normalizeExpression(trimmed.replace(/^return\s*/, ""), "ruby")};`);
      continue;
    }

    if (/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.test(trimmed)) {
      const [, name, expression] = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      output.push(`${indent(blockStack.length)}var ${name} = ${normalizeExpression(expression, "ruby")};`);
      continue;
    }

    output.push(`${indent(blockStack.length)}${normalizeExpression(trimmed, "ruby")};`);
  }

  while (blockStack.length) {
    blockStack.pop();
    output.push(`${indent(blockStack.length)}}`);
  }

  return output.join("\n");
}

function transpileLua(code) {
  const lines = splitLines(code);
  const output = [];
  const blockStack = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("--")) continue;

    if (trimmed === "end") {
      blockStack.pop();
      output.push(`${indent(blockStack.length)}}`);
      continue;
    }

    if (/^elseif\s+(.+)\s+then$/.test(trimmed)) {
      output.push(`${indent(Math.max(blockStack.length - 1, 0))}} else if (${normalizeCondition(trimmed.match(/^elseif\s+(.+)\s+then$/)[1], "lua")}) {`);
      continue;
    }

    if (trimmed === "else") {
      output.push(`${indent(Math.max(blockStack.length - 1, 0))}} else {`);
      continue;
    }

    if (/^function\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)$/.test(trimmed)) {
      const [, name, args] = trimmed.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)$/);
      output.push(`${indent(blockStack.length)}function ${name}(${args}) {`);
      blockStack.push("function");
      continue;
    }

    if (/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+),\s*(.+?)(?:,\s*(.+))?\s+do$/.test(trimmed)) {
      const [, variable, startValue, endValue, stepValue] = trimmed.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+),\s*(.+?)(?:,\s*(.+))?\s+do$/);
      output.push(`${indent(blockStack.length)}${buildRangeLoop(variable, normalizeExpression(startValue, "lua"), normalizeExpression(endValue, "lua"), normalizeExpression(stepValue || "1", "lua"))}`);
      blockStack.push("loop");
      continue;
    }

    if (/^while\s+(.+)\s+do$/.test(trimmed)) {
      output.push(`${indent(blockStack.length)}while (${normalizeCondition(trimmed.match(/^while\s+(.+)\s+do$/)[1], "lua")}) {`);
      blockStack.push("while");
      continue;
    }

    if (/^if\s+(.+)\s+then$/.test(trimmed)) {
      output.push(`${indent(blockStack.length)}if (${normalizeCondition(trimmed.match(/^if\s+(.+)\s+then$/)[1], "lua")}) {`);
      blockStack.push("if");
      continue;
    }

    if (/^print\s*\(([\s\S]+)\)$/.test(trimmed)) {
      output.push(`${indent(blockStack.length)}${translatePrint(trimmed.match(/^print\s*\(([\s\S]+)\)$/)[1], "lua")}`);
      continue;
    }

    if (/^return\b/.test(trimmed)) {
      output.push(`${indent(blockStack.length)}return ${normalizeExpression(trimmed.replace(/^return\s*/, ""), "lua")};`);
      continue;
    }

    if (/^(?:local\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.test(trimmed)) {
      const [, name, expression] = trimmed.match(/^(?:local\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      output.push(`${indent(blockStack.length)}var ${name} = ${normalizeExpression(expression, "lua")};`);
      continue;
    }

    output.push(`${indent(blockStack.length)}${normalizeExpression(trimmed, "lua")};`);
  }

  while (blockStack.length) {
    blockStack.pop();
    output.push(`${indent(blockStack.length)}}`);
  }

  return output.join("\n");
}

function transpileMatlab(code) {
  const lines = splitLines(code);
  const output = [];
  const blockStack = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("%")) continue;

    if (/^end$/i.test(trimmed)) {
      const block = blockStack.pop();
      if (block?.type === "function" && block.returnVar) {
        output.push(`${indent(blockStack.length + 1)}return ${block.returnVar};`);
      }
      output.push(`${indent(blockStack.length)}}`);
      continue;
    }

    if (/^elseif\s+(.+)$/i.test(trimmed)) {
      output.push(`${indent(Math.max(blockStack.length - 1, 0))}} else if (${normalizeCondition(trimmed.match(/^elseif\s+(.+)$/i)[1], "matlab")}) {`);
      continue;
    }

    if (/^else$/i.test(trimmed)) {
      output.push(`${indent(Math.max(blockStack.length - 1, 0))}} else {`);
      continue;
    }

    if (/^function\s+(?:(\w+)\s*=\s*)?(\w+)\(([^)]*)\)$/i.test(trimmed)) {
      const [, returnVar, name, args] = trimmed.match(/^function\s+(?:(\w+)\s*=\s*)?(\w+)\(([^)]*)\)$/i);
      output.push(`${indent(blockStack.length)}function ${name}(${args}) {`);
      if (returnVar) output.push(`${indent(blockStack.length + 1)}let ${returnVar};`);
      blockStack.push({ type: "function", returnVar });
      continue;
    }

    if (/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\d+)\s*:\s*(\d+)$/i.test(trimmed)) {
      const [, variable, startValue, endValue] = trimmed.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\d+)\s*:\s*(\d+)$/i);
      output.push(`${indent(blockStack.length)}${buildRangeLoop(variable, startValue, endValue, "1")}`);
      blockStack.push({ type: "loop" });
      continue;
    }

    if (/^while\s+(.+)$/i.test(trimmed)) {
      output.push(`${indent(blockStack.length)}while (${normalizeCondition(trimmed.match(/^while\s+(.+)$/i)[1], "matlab")}) {`);
      blockStack.push({ type: "while" });
      continue;
    }

    if (/^if\s+(.+)$/i.test(trimmed)) {
      output.push(`${indent(blockStack.length)}if (${normalizeCondition(trimmed.match(/^if\s+(.+)$/i)[1], "matlab")}) {`);
      blockStack.push({ type: "if" });
      continue;
    }

    if (/^disp\s*\(([\s\S]+)\)\s*;?$/i.test(trimmed)) {
      output.push(`${indent(blockStack.length)}${translatePrint(trimmed.match(/^disp\s*\(([\s\S]+)\)\s*;?$/i)[1], "matlab")}`);
      continue;
    }

    if (/^return\b/i.test(trimmed)) {
      output.push(`${indent(blockStack.length)}return ${normalizeExpression(trimmed.replace(/^return\s*/i, ""), "matlab")};`);
      continue;
    }

    if (/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?);?$/i.test(trimmed)) {
      const [, name, expression] = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?);?$/i);
      const currentBlock = blockStack[blockStack.length - 1];
      const prefix = currentBlock?.type === "function" && currentBlock.returnVar === name ? "" : "var ";
      output.push(`${indent(blockStack.length)}${prefix}${name} = ${normalizeExpression(expression, "matlab")};`);
      continue;
    }

    output.push(`${indent(blockStack.length)}${normalizeExpression(trimmed, "matlab")};`);
  }

  while (blockStack.length) {
    const block = blockStack.pop();
    if (block?.type === "function" && block.returnVar) {
      output.push(`${indent(blockStack.length + 1)}return ${block.returnVar};`);
    }
    output.push(`${indent(blockStack.length)}}`);
  }

  return output.join("\n");
}

function transpileBasic(code) {
  const lines = splitLines(code, { stripBasicNumbers: true });
  const output = [];
  const stack = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.toUpperCase().startsWith("REM ")) continue;

    if (/^END FUNCTION$/i.test(trimmed)) {
      stack.pop();
      output.push(`${indent(stack.length)}}`);
      continue;
    }

    if (/^NEXT\b/i.test(trimmed)) {
      stack.pop();
      output.push(`${indent(stack.length)}}`);
      continue;
    }

    if (/^END IF$/i.test(trimmed)) {
      stack.pop();
      output.push(`${indent(stack.length)}}`);
      continue;
    }

    if (/^ELSE$/i.test(trimmed)) {
      output.push(`${indent(Math.max(stack.length - 1, 0))}} else {`);
      continue;
    }

    if (/^FUNCTION\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)$/i.test(trimmed)) {
      const [, name, args] = trimmed.match(/^FUNCTION\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)$/i);
      output.push(`${indent(stack.length)}function ${name}(${args.replace(/\$/g, "")}) {`);
      stack.push("function");
      continue;
    }

    if (/^FOR\s+([A-Za-z_][A-Za-z0-9_]*\$?)\s*=\s*(.+)\s+TO\s+(.+?)(?:\s+STEP\s+(.+))?$/i.test(trimmed)) {
      const [, variable, startValue, endValue, stepValue] = trimmed.match(/^FOR\s+([A-Za-z_][A-Za-z0-9_]*\$?)\s*=\s*(.+)\s+TO\s+(.+?)(?:\s+STEP\s+(.+))?$/i);
      output.push(`${indent(stack.length)}${buildRangeLoop(variable.replace(/\$/g, ""), normalizeExpression(startValue, "basic"), normalizeExpression(endValue, "basic"), normalizeExpression(stepValue || "1", "basic"))}`);
      stack.push("loop");
      continue;
    }

    if (/^IF\s+(.+)\s+THEN$/i.test(trimmed)) {
      output.push(`${indent(stack.length)}if (${normalizeCondition(trimmed.match(/^IF\s+(.+)\s+THEN$/i)[1], "basic")}) {`);
      stack.push("if");
      continue;
    }

    if (/^PRINT\s+(.+)$/i.test(trimmed)) {
      output.push(`${indent(stack.length)}${translatePrint(trimmed.match(/^PRINT\s+(.+)$/i)[1], "basic")}`);
      continue;
    }

    if (/^RETURN\b/i.test(trimmed)) {
      output.push(`${indent(stack.length)}return ${normalizeExpression(trimmed.replace(/^RETURN\s*/i, ""), "basic")};`);
      continue;
    }

    if (/^(?:LET\s+)?([A-Za-z_][A-Za-z0-9_]*\$?)\s*=\s*(.+)$/i.test(trimmed)) {
      const [, name, expression] = trimmed.match(/^(?:LET\s+)?([A-Za-z_][A-Za-z0-9_]*\$?)\s*=\s*(.+)$/i);
      output.push(`${indent(stack.length)}var ${name.replace(/\$/g, "")} = ${normalizeExpression(expression, "basic")};`);
      continue;
    }

    output.push(`${indent(stack.length)}${normalizeExpression(trimmed, "basic")};`);
  }

  while (stack.length) {
    stack.pop();
    output.push(`${indent(stack.length)}}`);
  }

  return output.join("\n");
}

function transpileVBScript(code) {
  const lines = splitLines(code);
  const output = [];
  const stack = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("'")) continue;

    if (/^Dim\s+/i.test(trimmed)) continue;

    if (/^End Function$/i.test(trimmed) || /^End Sub$/i.test(trimmed) || /^Next$/i.test(trimmed) || /^End If$/i.test(trimmed)) {
      stack.pop();
      output.push(`${indent(stack.length)}}`);
      continue;
    }

    if (/^ElseIf\s+(.+)\s+Then$/i.test(trimmed)) {
      output.push(`${indent(Math.max(stack.length - 1, 0))}} else if (${normalizeCondition(trimmed.match(/^ElseIf\s+(.+)\s+Then$/i)[1], "vbscript")}) {`);
      continue;
    }

    if (/^Else$/i.test(trimmed)) {
      output.push(`${indent(Math.max(stack.length - 1, 0))}} else {`);
      continue;
    }

    if (/^(Function|Sub)\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)$/i.test(trimmed)) {
      const [, kind, name, args] = trimmed.match(/^(Function|Sub)\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)$/i);
      output.push(`${indent(stack.length)}function ${name}(${args}) {`);
      stack.push({ type: kind.toLowerCase(), name });
      continue;
    }

    if (/^For\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s+To\s+(.+?)(?:\s+Step\s+(.+))?$/i.test(trimmed)) {
      const [, variable, startValue, endValue, stepValue] = trimmed.match(/^For\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s+To\s+(.+?)(?:\s+Step\s+(.+))?$/i);
      output.push(`${indent(stack.length)}${buildRangeLoop(variable, normalizeExpression(startValue, "vbscript"), normalizeExpression(endValue, "vbscript"), normalizeExpression(stepValue || "1", "vbscript"))}`);
      stack.push("loop");
      continue;
    }

    if (/^If\s+(.+)\s+Then$/i.test(trimmed)) {
      output.push(`${indent(stack.length)}if (${normalizeCondition(trimmed.match(/^If\s+(.+)\s+Then$/i)[1], "vbscript")}) {`);
      stack.push("if");
      continue;
    }

    if (/^WScript\.Echo\s+(.+)$/i.test(trimmed)) {
      output.push(`${indent(stack.length)}${translatePrint(trimmed.match(/^WScript\.Echo\s+(.+)$/i)[1], "vbscript")}`);
      continue;
    }

    if (/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i.test(trimmed)) {
      const [, name, expression] = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i);
      const currentBlock = stack[stack.length - 1];
      if (currentBlock?.type === "function" && currentBlock.name.toLowerCase() === name.toLowerCase()) {
        output.push(`${indent(stack.length)}return ${normalizeExpression(expression, "vbscript")};`);
        continue;
      }
      output.push(`${indent(stack.length)}var ${name} = ${normalizeExpression(expression, "vbscript")};`);
      continue;
    }

    output.push(`${indent(stack.length)}${normalizeExpression(trimmed, "vbscript")};`);
  }

  while (stack.length) {
    stack.pop();
    output.push(`${indent(stack.length)}}`);
  }

  return output.join("\n");
}

function transpileBash(code) {
  const lines = splitLines(code);
  const output = [];
  const stack = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("#!")) continue;

    if (trimmed === "done" || trimmed === "fi" || trimmed === "}") {
      stack.pop();
      output.push(`${indent(stack.length)}}`);
      continue;
    }

    if (/^else$/.test(trimmed)) {
      output.push(`${indent(Math.max(stack.length - 1, 0))}} else {`);
      continue;
    }

    if (/^elif\s+(.+);\s*then$/.test(trimmed)) {
      output.push(`${indent(Math.max(stack.length - 1, 0))}} else if (${normalizeCondition(trimmed.match(/^elif\s+(.+);\s*then$/)[1], "bash")}) {`);
      continue;
    }

    if (/^([A-Za-z_][A-Za-z0-9_]*)\(\)\s*\{$/.test(trimmed)) {
      const [, name] = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\(\)\s*\{$/);
      output.push(`${indent(stack.length)}function ${name}(...__args) {`);
      stack.push("function");
      continue;
    }

    if (/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+);\s*do$/.test(trimmed)) {
      const [, variable, values] = trimmed.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+);\s*do$/);
      const list = values.split(/\s+/).filter(Boolean).map((value) => normalizeExpression(value, "bash")).join(", ");
      output.push(`${indent(stack.length)}for (const ${variable} of [${list}]) {`);
      stack.push("loop");
      continue;
    }

    if (/^while\s+(.+);\s*do$/.test(trimmed)) {
      output.push(`${indent(stack.length)}while (${normalizeCondition(trimmed.match(/^while\s+(.+);\s*do$/)[1], "bash")}) {`);
      stack.push("while");
      continue;
    }

    if (/^if\s+(.+);\s*then$/.test(trimmed)) {
      output.push(`${indent(stack.length)}if (${normalizeCondition(trimmed.match(/^if\s+(.+);\s*then$/)[1], "bash")}) {`);
      stack.push("if");
      continue;
    }

    if (/^echo\s+(.+)$/.test(trimmed)) {
      output.push(`${indent(stack.length)}${translatePrint(trimmed.match(/^echo\s+(.+)$/)[1], "bash")}`);
      continue;
    }

    if (/^return\b/.test(trimmed)) {
      output.push(`${indent(stack.length)}return ${normalizeExpression(trimmed.replace(/^return\s*/, ""), "bash")};`);
      continue;
    }

    if (/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/.test(trimmed)) {
      const [, name, expression] = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/);
      output.push(`${indent(stack.length)}var ${name} = ${normalizeExpression(expression, "bash")};`);
      continue;
    }

    if (/^([A-Za-z_][A-Za-z0-9_]*)\b(?:\s+.+)?$/.test(trimmed)) {
      const [name, ...args] = splitArgsPreservingQuotes(trimmed);
      if (name && args.length) {
        const normalizedArgs = args.map((item) => {
          const positional = item.match(/^["']?\$([1-9]\d*)["']?$/);
          if (positional) return `__args[${Number(positional[1]) - 1}]`;
          const named = item.match(/^["']?\$([A-Za-z_][A-Za-z0-9_]*)["']?$/);
          if (named) return named[1];
          return normalizeExpression(item, "bash");
        });
        output.push(`${indent(stack.length)}${name}(${normalizedArgs.join(", ")});`);
        continue;
      }
    }

    output.push(`${indent(stack.length)}${normalizeExpression(trimmed, "bash")};`);
  }

  while (stack.length) {
    stack.pop();
    output.push(`${indent(stack.length)}}`);
  }

  return output.join("\n");
}

function transpileVBasedBlocks(code, language) {
  const lines = splitLines(code);
  const output = [];
  let functionParamRewrite = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (language === "php" && /^<\?php$/.test(trimmed)) continue;

    if (/^\}$/.test(trimmed)) {
      output.push("}");
      continue;
    }

    if (language === "perl" && /^my\s*\(([^)]*)\)\s*=\s*@_;?$/.test(trimmed)) {
      const params = trimmed.match(/^my\s*\(([^)]*)\)\s*=\s*@_;?$/)[1].replace(/\$/g, "");
      output.push(`let [${params}] = __args;`);
      continue;
    }

    if (language === "powershell" && /^function\s+([A-Za-z_][A-Za-z0-9_-]*)\(([^)]*)\)\s*\{$/i.test(trimmed)) {
      const [, name, args] = trimmed.match(/^function\s+([A-Za-z_][A-Za-z0-9_-]*)\(([^)]*)\)\s*\{$/i);
      output.push(`function ${name.replace(/-/g, "_")}(${args.replace(/\$/g, "")}) {`);
      continue;
    }

    if (language === "perl" && /^sub\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{$/i.test(trimmed)) {
      const [, name] = trimmed.match(/^sub\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{$/i);
      output.push(`function ${name}(...__args) {`);
      functionParamRewrite = true;
      continue;
    }

    if ((language === "php" || language === "powershell") && /^function\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)\s*\{$/i.test(trimmed)) {
      const [, name, args] = trimmed.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)\s*\{$/i);
      output.push(`function ${name}(${args.replace(/\$/g, "")}) {`);
      continue;
    }

    if (language === "r" && /^([A-Za-z_][A-Za-z0-9_]*)\s*<-\s*function\(([^)]*)\)\s*\{$/i.test(trimmed)) {
      const [, name, args] = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*<-\s*function\(([^)]*)\)\s*\{$/i);
      output.push(`function ${name}(${args}) {`);
      continue;
    }

    if (language === "perl" && /^for\s+my\s+\$([A-Za-z_][A-Za-z0-9_]*)\s*\((.+)\.\.(.+)\)\s*\{$/i.test(trimmed)) {
      const [, variable, startValue, endValue] = trimmed.match(/^for\s+my\s+\$([A-Za-z_][A-Za-z0-9_]*)\s*\((.+)\.\.(.+)\)\s*\{$/i);
      output.push(buildRangeLoop(variable, normalizeExpression(startValue, "perl"), normalizeExpression(endValue, "perl")));
      continue;
    }

    if (language === "r" && /^for\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(\d+)\s*:\s*(\d+)\s*\)\s*\{$/i.test(trimmed)) {
      const [, variable, startValue, endValue] = trimmed.match(/^for\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(\d+)\s*:\s*(\d+)\s*\)\s*\{$/i);
      output.push(buildRangeLoop(variable, startValue, endValue));
      continue;
    }

    if (language === "powershell" && /^for\s*\((.+)\)\s*\{$/i.test(trimmed)) {
      const inner = trimmed.match(/^for\s*\((.+)\)\s*\{$/i)[1].replace(/\$/g, "");
      output.push(`for (${normalizeExpression(inner, "powershell")}) {`);
      continue;
    }

    if (language === "php" && /^for\s*\((.+)\)\s*\{$/i.test(trimmed)) {
      const inner = trimmed.match(/^for\s*\((.+)\)\s*\{$/i)[1].replace(/\$/g, "");
      output.push(`for (${normalizeExpression(inner, "php")}) {`);
      continue;
    }

    if ((language === "php" || language === "perl" || language === "powershell") && /^while\s*\((.+)\)\s*\{$/i.test(trimmed)) {
      output.push(`while (${normalizeCondition(trimmed.match(/^while\s*\((.+)\)\s*\{$/i)[1], language)}) {`);
      continue;
    }

    if ((language === "php" || language === "powershell" || language === "r") && /^if\s*\((.+)\)\s*\{$/i.test(trimmed)) {
      output.push(`if (${normalizeCondition(trimmed.match(/^if\s*\((.+)\)\s*\{$/i)[1], language)}) {`);
      continue;
    }

    if ((language === "php" || language === "powershell" || language === "r") && /^else\s+if\s*\((.+)\)\s*\{$/i.test(trimmed)) {
      output.push(`else if (${normalizeCondition(trimmed.match(/^else\s+if\s*\((.+)\)\s*\{$/i)[1], language)}) {`);
      continue;
    }

    if ((language === "php" || language === "powershell" || language === "r") && /^elseif\s*\((.+)\)\s*\{$/i.test(trimmed)) {
      output.push(`else if (${normalizeCondition(trimmed.match(/^elseif\s*\((.+)\)\s*\{$/i)[1], language)}) {`);
      continue;
    }

    if (/^else\s*\{$/i.test(trimmed)) {
      output.push("else {");
      continue;
    }

    if ((language === "php" || language === "powershell") && /^(?:Write-Output|echo|print)\s+(.+?);?$/i.test(trimmed)) {
      output.push(translatePrint(trimmed.match(/^(?:Write-Output|echo|print)\s+(.+?);?$/i)[1], language));
      continue;
    }

    if (language === "perl" && /^print\s+(.+?);?$/i.test(trimmed)) {
      output.push(translatePrint(trimmed.match(/^print\s+(.+?);?$/i)[1], "perl"));
      continue;
    }

    if (language === "r" && /^(?:print|cat)\s*\(([\s\S]+)\)\s*;?$/i.test(trimmed)) {
      output.push(translatePrint(trimmed.match(/^(?:print|cat)\s*\(([\s\S]+)\)\s*;?$/i)[1], "r"));
      continue;
    }

    if (/^return\b/i.test(trimmed)) {
      output.push(`return ${normalizeExpression(trimmed.replace(/^return\s*/i, ""), language)};`);
      continue;
    }

    const cleaned = trimmed.replace(/;$/, "");

    if ((language === "php" || language === "powershell" || language === "perl") && /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.test(cleaned.replace(/\$/g, ""))) {
      const [, name, expression] = cleaned.replace(/\$/g, "").match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      output.push(`var ${name} = ${normalizeExpression(expression, language)};`);
      continue;
    }

    if (language === "r" && /^([A-Za-z_][A-Za-z0-9_]*)\s*<-\s*(.+)$/.test(cleaned)) {
      const [, name, expression] = cleaned.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*<-\s*(.+)$/);
      output.push(`var ${name} = ${normalizeExpression(expression, "r")};`);
      continue;
    }

    output.push(`${normalizeExpression(cleaned, language)};`);
  }

  if (functionParamRewrite) {
    return output.join("\n").replace(/function\s+([A-Za-z_][A-Za-z0-9_]*)\(\.\.\.__args\)\s*\{\nlet \[([^\]]*)\] = __args;/g, "function $1($2) {");
  }

  return output.join("\n");
}

function tokenizeLisp(code) {
  const source = String(code ?? "").replace(/;.*$/gm, "");
  const tokens = [];
  let current = "";
  let quote = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      current += char;
      if (char === quote && source[index - 1] !== "\\") {
        tokens.push(current);
        current = "";
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
      current = char;
      quote = char;
      continue;
    }

    if (char === "(" || char === ")") {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
      tokens.push(char);
      continue;
    }

    if (/\s/.test(char)) {
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

function parseLisp(code) {
  const tokens = tokenizeLisp(code);
  let index = 0;

  function read() {
    const token = tokens[index++];
    if (token === "(") {
      const items = [];
      while (tokens[index] !== ")" && index < tokens.length) {
        items.push(read());
      }
      index += 1;
      return items;
    }
    if (token === '"') return "";
    if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token);
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return token.slice(1, -1);
    }
    return { symbol: token };
  }

  const program = [];
  while (index < tokens.length) {
    program.push(read());
  }
  return program;
}

function evalLispExpression(node, env, functions, outputs) {
  env.__guard.steps += 1;
  if (env.__guard.steps > env.__guard.maxSteps) {
    throw new Error("Execution stopped: the snippet exceeded the safe operation limit. Add an end condition or reduce the input size.");
  }

  if (Array.isArray(node)) {
    const [head, ...rest] = node;
    const symbol = head?.symbol?.toLowerCase?.() ?? "";

    if (symbol === "setq") {
      env[rest[0].symbol] = evalLispExpression(rest[1], env, functions, outputs);
      return env[rest[0].symbol];
    }

    if (symbol === "print") {
      const value = evalLispExpression(rest[0], env, functions, outputs);
      outputs.push(String(value));
      return value;
    }

    if (symbol === "concatenate") {
      return rest.slice(1).map((item) => evalLispExpression(item, env, functions, outputs)).join("");
    }

    if (symbol === "defun") {
      const name = rest[0].symbol;
      const params = rest[1].map((item) => item.symbol);
      const body = rest.slice(2);
      functions[name] = { params, body };
      return null;
    }

    if (symbol === "dotimes") {
      const [spec, ...body] = rest;
      const variable = spec[0].symbol;
      const count = Number(evalLispExpression(spec[1], env, functions, outputs)) || 0;
      for (let iteration = 0; iteration < count; iteration += 1) {
        env.__guard.loopIterations += 1;
        if (env.__guard.loopIterations > env.__guard.maxLoopIterations) {
          throw new Error("Execution stopped: the loop exceeded the safe iteration limit. Add a base case or tighter bounds.");
        }
        env[variable] = iteration;
        for (const form of body) evalLispExpression(form, env, functions, outputs);
      }
      return null;
    }

    if (symbol === "if") {
      const condition = evalLispExpression(rest[0], env, functions, outputs);
      return condition
        ? evalLispExpression(rest[1], env, functions, outputs)
        : evalLispExpression(rest[2], env, functions, outputs);
    }

    if (["+", "-", "*", "/", "<", ">", "<=", ">=", "="].includes(symbol)) {
      const values = rest.map((item) => evalLispExpression(item, env, functions, outputs));
      switch (symbol) {
        case "+":
          return values.reduce((sum, value) => sum + value, 0);
        case "-":
          return values.slice(1).reduce((total, value) => total - value, values[0] ?? 0);
        case "*":
          return values.reduce((total, value) => total * value, 1);
        case "/":
          return values.slice(1).reduce((total, value) => total / value, values[0] ?? 1);
        case "<":
          return values[0] < values[1];
        case ">":
          return values[0] > values[1];
        case "<=":
          return values[0] <= values[1];
        case ">=":
          return values[0] >= values[1];
        default:
          return values[0] === values[1];
      }
    }

    const fn = functions[symbol];
    if (fn) {
      env.__guard.functionDepth += 1;
      if (env.__guard.functionDepth > env.__guard.maxFunctionDepth) {
        throw new Error("Execution stopped: the call stack exceeded the safe recursion depth. Add a base case.");
      }
      try {
        const localEnv = { ...env };
        fn.params.forEach((param, index) => {
          localEnv[param] = evalLispExpression(rest[index], env, functions, outputs);
        });
        let result = null;
        for (const form of fn.body) {
          result = evalLispExpression(form, localEnv, functions, outputs);
        }
        return result;
      } finally {
        env.__guard.functionDepth -= 1;
      }
    }

    return null;
  }

  if (typeof node === "number" || typeof node === "string") return node;
  if (node?.symbol && Object.prototype.hasOwnProperty.call(env, node.symbol)) return env[node.symbol];
  if (node?.symbol === "nil") return null;
  return node?.symbol ?? null;
}

export function transpileLightIdeCode(language, code) {
  const source = language === "php" ? stripPhpTags(code) : String(code ?? "");

  switch (language) {
    case "python":
      return transpilePython(source);
    case "php":
      return transpileVBasedBlocks(source, "php");
    case "ruby":
      return transpileRuby(source);
    case "perl":
      return transpileVBasedBlocks(source, "perl");
    case "r":
      return transpileVBasedBlocks(source, "r");
    case "lua":
      return transpileLua(source);
    case "matlab":
      return transpileMatlab(source);
    case "basic":
      return transpileBasic(source);
    case "bash":
      return transpileBash(source);
    case "powershell":
      return transpileVBasedBlocks(source, "powershell");
    case "vbscript":
      return transpileVBScript(source);
    case "lisp":
      return source;
    default:
      return String(code ?? "");
  }
}

export function runLightIdeCode(language, code) {
  if (language === "lisp") {
    try {
      const program = parseLisp(code);
      const env = {
        __guard: {
          steps: 0,
          loopIterations: 0,
          functionDepth: 0,
          maxSteps: 25000,
          maxLoopIterations: 6000,
          maxFunctionDepth: 80
        }
      };
      const functions = {};
      const outputs = [];
      for (const form of program) {
        evalLispExpression(form, env, functions, outputs);
      }
      return {
        ok: true,
        output: outputs.join("\n") || "Code ran with no output."
      };
    } catch (error) {
      return { ok: false, output: error.message };
    }
  }

  try {
    const jsCode = transpileLightIdeCode(language, code);
    const result = runJavaScriptSnippet(instrumentTranspiledJavaScript(jsCode));
    return result.ok
      ? result
      : {
          ok: false,
          output: `Unsupported ${language} feature or invalid syntax in lightweight browser runner: ${result.output}`
        };
  } catch (error) {
    return {
      ok: false,
      output: `Unsupported ${language} feature or invalid syntax in lightweight browser runner: ${error.message}`
    };
  }
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
