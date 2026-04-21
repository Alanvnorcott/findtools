import { useEffect, useMemo, useState } from "react";
import { ActionRow, InlineMessage, KeyValueList, ResultPanel, ToolInput } from "../components/common";
import { ToolShell } from "../components/ToolShell";
import { readJsonPath, transformBase64 } from "../lib/toolLogic/dev";

async function digest(value, algorithm) {
  const encoded = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest(algorithm, encoded);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function miniTool(tool, shellProps, instructions, inputArea, output, validation) {
  tool.copyValue = () => (typeof output === "string" ? output : "");
  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions={instructions}
      validation={validation}
      inputArea={inputArea}
      outputArea={typeof output === "string" ? <ResultPanel value={output} /> : output}
    />
  );
}

export function Base64Tool({ tool, ...shellProps }) {
  const [value, setValue] = useState("Findtools keeps everything in the browser.");
  const [mode, setMode] = useState("encode");
  const result = useMemo(() => transformBase64(value, mode), [mode, value]);
  return miniTool(
    tool,
    shellProps,
    "Encode plain text to Base64 or decode Base64 back to text.",
    <>
      <ToolInput label="Mode"><select value={mode} onChange={(e) => setMode(e.target.value)}><option value="encode">Encode</option><option value="decode">Decode</option></select></ToolInput>
      <ToolInput label="Value"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>
      <ActionRow><button className="button button--secondary" onClick={() => setValue("")} type="button">Clear</button><button className="button" onClick={() => { setMode("encode"); setValue("Findtools keeps everything in the browser."); }} type="button">Reset</button></ActionRow>
    </>,
    result
  );
}

export function UrlCodecTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("https://example.com/search?q=quiet workspace");
  const [mode, setMode] = useState("encode");
  const output = useMemo(() => {
    try {
      return mode === "encode" ? encodeURIComponent(value) : decodeURIComponent(value);
    } catch {
      return "Invalid encoded URL value.";
    }
  }, [mode, value]);
  return miniTool(
    tool,
    shellProps,
    "Encode or decode URL fragments.",
    <>
      <ToolInput label="Mode"><select value={mode} onChange={(e) => setMode(e.target.value)}><option value="encode">Encode</option><option value="decode">Decode</option></select></ToolInput>
      <ToolInput label="Value"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>
      <ActionRow><button className="button button--secondary" onClick={() => setValue("")} type="button">Clear</button><button className="button" onClick={() => { setMode("encode"); setValue("https://example.com/search?q=quiet workspace"); }} type="button">Reset</button></ActionRow>
    </>,
    output
  );
}

export function UrlParserTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("https://example.com:8080/path/to/page?tab=tools&mode=local#details");
  const items = useMemo(() => {
    try {
      const url = new URL(value);
      return [
        { label: "Protocol", value: url.protocol },
        { label: "Host", value: url.host },
        { label: "Hostname", value: url.hostname },
        { label: "Port", value: url.port || "-" },
        { label: "Pathname", value: url.pathname },
        { label: "Query", value: url.search || "-" },
        { label: "Hash", value: url.hash || "-" }
      ];
    } catch {
      return [];
    }
  }, [value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Parse a URL into its components."
      validation={!items.length ? <InlineMessage tone="error">Enter a valid URL.</InlineMessage> : null}
      inputArea={<><ToolInput label="URL"><textarea rows="8" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput><ActionRow><button className="button button--secondary" onClick={() => setValue("")} type="button">Clear</button></ActionRow></>}
      outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>}
    />
  );
}

export function JwtDecoderTool({ tool, ...shellProps }) {
  const [token, setToken] = useState("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiRmluZFRvb2xzIiwicm9sZSI6InVzZXIifQ.signature");
  const decoded = useMemo(() => {
    try {
      const [header, payload] = token.split(".");
      const parsePart = (part) => JSON.stringify(JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))), null, 2);
      return { ok: true, text: `Header\n${parsePart(header)}\n\nPayload\n${parsePart(payload)}` };
    } catch {
      return { ok: false, text: "Enter a valid JWT to decode header and payload." };
    }
  }, [token]);
  return miniTool(tool, shellProps, "Decode JWT header and payload locally. Signature verification is not performed.", <><ToolInput label="JWT token"><textarea rows="12" value={token} onChange={(e) => setToken(e.target.value)} /></ToolInput><ActionRow><button className="button button--secondary" onClick={() => setToken("")} type="button">Clear</button></ActionRow></>, decoded.text, <InlineMessage tone={decoded.ok ? "success" : "warning"}>{decoded.ok ? "Decoded locally." : "Waiting for a valid token."}</InlineMessage>);
}

export function TimestampConverterTool({ tool, ...shellProps }) {
  const [timestamp, setTimestamp] = useState(String(Math.floor(Date.now() / 1000)));
  const [dateValue, setDateValue] = useState(new Date().toISOString().slice(0, 16));
  const output = useMemo(() => {
    const unixDate = new Date(Number(timestamp) * 1000);
    const pickedDate = new Date(dateValue);
    return `From timestamp: ${Number.isNaN(unixDate.getTime()) ? "Invalid" : unixDate.toLocaleString()}\nFrom date: ${Math.floor(pickedDate.getTime() / 1000)}`;
  }, [dateValue, timestamp]);
  return miniTool(tool, shellProps, "Convert between Unix timestamps and local date/time values.", <><div className="split-fields"><ToolInput label="Unix timestamp"><input value={timestamp} onChange={(e) => setTimestamp(e.target.value)} /></ToolInput><ToolInput label="Date and time"><input type="datetime-local" value={dateValue} onChange={(e) => setDateValue(e.target.value)} /></ToolInput></div><ActionRow><button className="button" onClick={() => { setTimestamp(String(Math.floor(Date.now() / 1000))); setDateValue(new Date().toISOString().slice(0, 16)); }} type="button">Use now</button></ActionRow></>, output);
}

export function UuidGeneratorTool({ tool, ...shellProps }) {
  const [uuids, setUuids] = useState(() => Array.from({ length: 5 }, () => crypto.randomUUID()));
  const output = uuids.join("\n");
  return miniTool(tool, shellProps, "Generate UUIDs using the browser crypto API.", <ActionRow><button className="button" onClick={() => setUuids(Array.from({ length: 5 }, () => crypto.randomUUID()))} type="button">Generate 5 UUIDs</button><button className="button button--secondary" onClick={() => setUuids([crypto.randomUUID()])} type="button">Generate 1 UUID</button></ActionRow>, output);
}

export function UuidValidatorTool({ tool, ...shellProps }) {
  const [value, setValue] = useState(crypto.randomUUID());
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  return miniTool(tool, shellProps, "Validate whether a string matches a UUID pattern.", <><ToolInput label="UUID value"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput><ActionRow><button className="button" onClick={() => setValue(crypto.randomUUID())} type="button">Use sample UUID</button></ActionRow></>, valid ? "Valid UUID" : "Invalid UUID", <InlineMessage tone={valid ? "success" : "error"}>{valid ? "Looks valid." : "Does not match the UUID pattern."}</InlineMessage>);
}

export function HashGeneratorTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("Findtools");
  const [algorithm, setAlgorithm] = useState("SHA-256");
  const [output, setOutput] = useState("");
  useEffect(() => { digest(value, algorithm).then(setOutput); }, [algorithm, value]);
  return miniTool(tool, shellProps, "Generate a text hash with the browser Web Crypto API.", <><ToolInput label="Algorithm"><select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}><option value="SHA-1">SHA-1</option><option value="SHA-256">SHA-256</option><option value="SHA-384">SHA-384</option><option value="SHA-512">SHA-512</option></select></ToolInput><ToolInput label="Value"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput></>, output);
}

export function HtmlMinifierTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("<div>\n  <span> Quiet tools </span>\n</div>");
  const output = useMemo(() => value.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim(), [value]);
  return miniTool(tool, shellProps, "Minify basic HTML by collapsing whitespace.", <><ToolInput label="HTML input"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput><ActionRow><button className="button button--secondary" onClick={() => setValue("")} type="button">Clear</button></ActionRow></>, output);
}

export function CssMinifierTool({ tool, ...shellProps }) {
  const [value, setValue] = useState(".card {\n  padding: 12px;\n  border: 1px solid #ccc;\n}");
  const output = useMemo(() => value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,])\s*/g, "$1").trim(), [value]);
  return miniTool(tool, shellProps, "Minify basic CSS by removing comments and extra whitespace.", <ToolInput label="CSS input"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function JsMinifierTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("function add(a, b) {\n  // demo\n  return a + b;\n}");
  const output = useMemo(() => value.replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").trim(), [value]);
  return miniTool(tool, shellProps, "Minify basic JavaScript by stripping line comments and repeated whitespace.", <ToolInput label="JavaScript input"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function HexToRgbTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("#1f2937");
  const output = useMemo(() => {
    const clean = value.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
    const int = Number.parseInt(full, 16);
    if (!Number.isFinite(int)) return "Invalid hex value.";
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgb(${r}, ${g}, ${b})`;
  }, [value]);
  return miniTool(tool, shellProps, "Convert a hex color to RGB.", <ToolInput label="Hex color"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function RgbToHexTool({ tool, ...shellProps }) {
  const [r, setR] = useState("31");
  const [g, setG] = useState("41");
  const [b, setB] = useState("55");
  const output = useMemo(() => `#${[r, g, b].map((item) => Math.max(0, Math.min(255, Number(item) || 0)).toString(16).padStart(2, "0")).join("")}`, [b, g, r]);
  return miniTool(tool, shellProps, "Convert RGB channel values to hex.", <div className="split-fields"><ToolInput label="R"><input value={r} onChange={(e) => setR(e.target.value)} /></ToolInput><ToolInput label="G"><input value={g} onChange={(e) => setG(e.target.value)} /></ToolInput><ToolInput label="B"><input value={b} onChange={(e) => setB(e.target.value)} /></ToolInput></div>, output);
}

export function RegexTesterTool({ tool, ...shellProps }) {
  const [pattern, setPattern] = useState("\\b\\w{5}\\b");
  const [flags, setFlags] = useState("g");
  const [value, setValue] = useState("quiet tools make daily work steadier");
  const output = useMemo(() => {
    try {
      const matches = value.match(new RegExp(pattern, flags));
      return (matches || []).join("\n");
    } catch (error) {
      return `Invalid regex: ${error.message}`;
    }
  }, [flags, pattern, value]);
  return miniTool(tool, shellProps, "Test a regular expression against text input.", <><div className="split-fields"><ToolInput label="Pattern"><input value={pattern} onChange={(e) => setPattern(e.target.value)} /></ToolInput><ToolInput label="Flags"><input value={flags} onChange={(e) => setFlags(e.target.value)} /></ToolInput></div><ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput></>, output);
}

export function QueryStringParserTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("tab=tools&mode=local&sort=name");
  const items = useMemo(() => [...new URLSearchParams(value).entries()].map(([label, paramValue]) => ({ label, value: paramValue })), [value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Parse a query string into key-value pairs." inputArea={<ToolInput label="Query string"><textarea rows="8" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function QueryStringBuilderTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("tab=tools\nmode=local\nsort=name");
  const output = useMemo(() => {
    const params = new URLSearchParams();
    value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
      const [key, ...rest] = line.split("=");
      params.append((key || "").trim(), rest.join("=").trim());
    });
    return params.toString();
  }, [value]);
  return miniTool(tool, shellProps, "Build a query string from one key=value pair per line.", <ToolInput label="Key-value lines"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function JsonStringEscapeTool({ tool, ...shellProps }) {
  const [value, setValue] = useState('Line one\n"Quoted" value');
  const output = useMemo(() => JSON.stringify(value), [value]);
  return miniTool(tool, shellProps, "Escape a string for safe JSON embedding.", <ToolInput label="Raw string"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function JsonStringUnescapeTool({ tool, ...shellProps }) {
  const [value, setValue] = useState('"Line one\\n\\"Quoted\\" value"');
  const output = useMemo(() => {
    try {
      return JSON.parse(value);
    } catch (error) {
      return `Invalid JSON string: ${error.message}`;
    }
  }, [value]);
  return miniTool(tool, shellProps, "Unescape a JSON string value into plain text.", <ToolInput label="JSON string"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function HtmlEscapeTool({ tool, ...shellProps }) {
  const [value, setValue] = useState('<div class="card">Findtools & more</div>');
  const output = useMemo(() => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), [value]);
  return miniTool(tool, shellProps, "Escape HTML-sensitive characters into entities.", <ToolInput label="Raw HTML"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function HtmlUnescapeTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("&lt;div class=&quot;card&quot;&gt;Findtools &amp; more&lt;/div&gt;");
  const output = useMemo(() => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"), [value]);
  return miniTool(tool, shellProps, "Convert basic HTML entities back into readable text.", <ToolInput label="Escaped HTML"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function HttpStatusLookupTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("404");
  const items = useMemo(() => {
    const statuses = {
      "200": ["OK", "The request succeeded."],
      "201": ["Created", "A resource was created successfully."],
      "301": ["Moved Permanently", "The URL has a permanent redirect."],
      "302": ["Found", "The URL has a temporary redirect."],
      "400": ["Bad Request", "The request could not be understood."],
      "401": ["Unauthorized", "Authentication is required or failed."],
      "403": ["Forbidden", "Access is denied."],
      "404": ["Not Found", "The resource could not be found."],
      "429": ["Too Many Requests", "Rate limit reached."],
      "500": ["Internal Server Error", "The server failed unexpectedly."],
      "502": ["Bad Gateway", "Upstream server returned an invalid response."],
      "503": ["Service Unavailable", "The service is temporarily unavailable."]
    };
    const match = statuses[value.trim()];
    return match ? [{ label: "Code", value: value.trim() }, { label: "Name", value: match[0] }, { label: "Meaning", value: match[1] }] : [];
  }, [value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Look up a common HTTP status code." validation={!items.length ? <InlineMessage tone="warning">Enter a common HTTP status code.</InlineMessage> : null} inputArea={<ToolInput label="HTTP status code"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function MimeTypeLookupTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("png");
  const items = useMemo(() => {
    const lookup = {
      txt: "text/plain",
      html: "text/html",
      css: "text/css",
      js: "text/javascript",
      json: "application/json",
      csv: "text/csv",
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
      zip: "application/zip"
    };
    const extension = value.trim().replace(/^\./, "").toLowerCase();
    const mime = lookup[extension];
    return mime ? [{ label: "Extension", value: extension }, { label: "MIME type", value: mime }] : [];
  }, [value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Look up a common MIME type from a file extension." validation={!items.length ? <InlineMessage tone="warning">Enter a known extension like png, pdf, json, or csv.</InlineMessage> : null} inputArea={<ToolInput label="Extension"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

function parseSimpleYaml(input) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  input.split(/\r?\n/).forEach((line) => {
    if (!line.trim() || line.trim().startsWith("#")) return;
    const indent = line.match(/^ */)?.[0].length || 0;
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].value;
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      const value = trimmed.slice(2).trim();
      if (!Array.isArray(parent.items)) parent.items = [];
      parent.items.push(value);
      return;
    }
    const [rawKey, ...rest] = trimmed.split(":");
    const key = rawKey.trim();
    const rawValue = rest.join(":").trim();
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
    return value.map((item) => `${indent}- ${typeof item === "object" ? JSON.stringify(item) : item}`).join("\n");
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
  const parts = input.replace(/>\s+</g, "><").split(/(?=<)|(?<=>)/g).filter(Boolean);
  let depth = 0;
  return parts.map((part) => {
    if (part.startsWith("</")) depth = Math.max(0, depth - 1);
    const line = `${"  ".repeat(depth)}${part}`;
    if (/^<[^!?/][^>]*[^/]?>$/.test(part)) depth += 1;
    return line;
  }).join("\n");
}

function xmlNodeToObject(node) {
  const children = [...node.children];
  if (!children.length) return node.textContent?.trim() || "";
  return Object.fromEntries(children.map((child) => [child.nodeName, xmlNodeToObject(child)]));
}

function formatSqlText(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN)\b/gi, "\n$1")
    .trim();
}

export function JsonPathTesterTool({ tool, ...shellProps }) {
  const [json, setJson] = useState('{"user":{"profile":{"name":"Ava"},"items":[{"id":1},{"id":2}]}}');
  const [path, setPath] = useState("user.profile.name");
  const output = useMemo(() => {
    try {
      const parsed = JSON.parse(json);
      return JSON.stringify(readJsonPath(parsed, path), null, 2);
    } catch (error) {
      return `Invalid JSON: ${error.message}`;
    }
  }, [json, path]);
  return miniTool(tool, shellProps, "Test a dot/bracket JSON path against a JSON document.", <><ToolInput label="JSON path"><input value={path} onChange={(e) => setPath(e.target.value)} /></ToolInput><ToolInput label="JSON input"><textarea rows="14" value={json} onChange={(e) => setJson(e.target.value)} /></ToolInput></>, output);
}

export function YamlFormatterTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("app:\n  name: Findtools\n  local: true");
  const output = useMemo(() => {
    try {
      return toSimpleYaml(parseSimpleYaml(value));
    } catch (error) {
      return `Invalid YAML: ${error.message}`;
    }
  }, [value]);
  return miniTool(tool, shellProps, "Format simple YAML using a browser-only parser.", <ToolInput label="YAML input"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function YamlToJsonTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("app:\n  name: Findtools\n  local: true");
  const output = useMemo(() => {
    try {
      return JSON.stringify(parseSimpleYaml(value), null, 2);
    } catch (error) {
      return `Invalid YAML: ${error.message}`;
    }
  }, [value]);
  return miniTool(tool, shellProps, "Convert simple YAML into JSON.", <ToolInput label="YAML input"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function JsonToYamlTool({ tool, ...shellProps }) {
  const [value, setValue] = useState('{"app":{"name":"Findtools","local":true}}');
  const output = useMemo(() => {
    try {
      return toSimpleYaml(JSON.parse(value));
    } catch (error) {
      return `Invalid JSON: ${error.message}`;
    }
  }, [value]);
  return miniTool(tool, shellProps, "Convert JSON into simple YAML.", <ToolInput label="JSON input"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function XmlFormatterTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("<root><item>alpha</item><item>bravo</item></root>");
  const output = useMemo(() => formatXmlText(value), [value]);
  return miniTool(tool, shellProps, "Format XML with indentation.", <ToolInput label="XML input"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function XmlToJsonTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("<root><name>Findtools</name><local>true</local></root>");
  const output = useMemo(() => {
    try {
      const doc = new DOMParser().parseFromString(value, "application/xml");
      if (doc.querySelector("parsererror")) return "Invalid XML input.";
      return JSON.stringify({ [doc.documentElement.nodeName]: xmlNodeToObject(doc.documentElement) }, null, 2);
    } catch (error) {
      return `Invalid XML: ${error.message}`;
    }
  }, [value]);
  return miniTool(tool, shellProps, "Convert XML into a simple JSON object.", <ToolInput label="XML input"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function SqlFormatterTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("select id, name from users where active = 1 order by name");
  const output = useMemo(() => formatSqlText(value), [value]);
  return miniTool(tool, shellProps, "Format common SQL keywords onto separate lines.", <ToolInput label="SQL input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function SqlMinifierTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("SELECT id, name\nFROM users\nWHERE active = 1\nORDER BY name");
  const output = useMemo(() => value.replace(/\s+/g, " ").trim(), [value]);
  return miniTool(tool, shellProps, "Minify SQL by collapsing whitespace.", <ToolInput label="SQL input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function CronExpressionParserTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("0 9 * * 1-5");
  const items = useMemo(() => {
    const [minute = "", hour = "", dayOfMonth = "", month = "", dayOfWeek = ""] = value.trim().split(/\s+/);
    return [
      { label: "Minute", value: minute || "-" },
      { label: "Hour", value: hour || "-" },
      { label: "Day of month", value: dayOfMonth || "-" },
      { label: "Month", value: month || "-" },
      { label: "Day of week", value: dayOfWeek || "-" }
    ];
  }, [value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Parse a standard five-part cron expression into fields." inputArea={<ToolInput label="Cron expression"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function CronExpressionBuilderTool({ tool, ...shellProps }) {
  const [minute, setMinute] = useState("0");
  const [hour, setHour] = useState("9");
  const [dayOfMonth, setDayOfMonth] = useState("*");
  const [month, setMonth] = useState("*");
  const [dayOfWeek, setDayOfWeek] = useState("1-5");
  const output = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
  return miniTool(tool, shellProps, "Build a standard five-part cron expression.", <div className="split-fields"><ToolInput label="Minute"><input value={minute} onChange={(e) => setMinute(e.target.value)} /></ToolInput><ToolInput label="Hour"><input value={hour} onChange={(e) => setHour(e.target.value)} /></ToolInput><ToolInput label="Day of month"><input value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} /></ToolInput><ToolInput label="Month"><input value={month} onChange={(e) => setMonth(e.target.value)} /></ToolInput><ToolInput label="Day of week"><input value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} /></ToolInput></div>, output);
}

export function HttpHeadersParserTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("Content-Type: application/json\nCache-Control: no-store\nX-Frame-Options: DENY");
  const items = useMemo(() => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [label, ...rest] = line.split(":");
    return { label: label.trim(), value: rest.join(":").trim() };
  }), [value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Parse raw HTTP header lines into key-value pairs." inputArea={<ToolInput label="Header lines"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function CurlBuilderTool({ tool, ...shellProps }) {
  const [method, setMethod] = useState("POST");
  const [url, setUrl] = useState("https://api.example.com/items");
  const [headers, setHeaders] = useState("Content-Type: application/json\nAuthorization: Bearer token");
  const [body, setBody] = useState('{"name":"alpha"}');
  const output = useMemo(() => {
    const headerArgs = headers.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => `-H "${line}"`).join(" ");
    const bodyArg = body.trim() ? ` --data '${body}'` : "";
    return `curl -X ${method} "${url}" ${headerArgs}${bodyArg}`.trim();
  }, [body, headers, method, url]);
  return miniTool(tool, shellProps, "Build a cURL command from method, URL, headers, and body.", <><div className="split-fields"><ToolInput label="Method"><input value={method} onChange={(e) => setMethod(e.target.value)} /></ToolInput><ToolInput label="URL"><input value={url} onChange={(e) => setUrl(e.target.value)} /></ToolInput></div><ToolInput label="Headers"><textarea rows="6" value={headers} onChange={(e) => setHeaders(e.target.value)} /></ToolInput><ToolInput label="Body"><textarea rows="8" value={body} onChange={(e) => setBody(e.target.value)} /></ToolInput></>, output);
}

export function CurlParserTool({ tool, ...shellProps }) {
  const [value, setValue] = useState('curl -X POST "https://api.example.com/items" -H "Content-Type: application/json" --data \'{"name":"alpha"}\'');
  const items = useMemo(() => {
    const method = (value.match(/-X\s+([A-Z]+)/i) || [])[1] || "GET";
    const url = (value.match(/"(https?:\/\/[^"]+)"/) || [])[1] || "";
    const headers = [...value.matchAll(/-H\s+"([^"]+)"/g)].map((match) => match[1]).join(" | ");
    const body = (value.match(/--data\s+'([^']+)'/) || [])[1] || "";
    return [{ label: "Method", value: method }, { label: "URL", value: url || "-" }, { label: "Headers", value: headers || "-" }, { label: "Body", value: body || "-" }];
  }, [value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Parse a simple cURL command into readable fields." inputArea={<ToolInput label="cURL command"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function EnvFileParserTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("APP_NAME=Findtools\nNODE_ENV=production\nAPI_KEY=demo-key");
  const items = useMemo(() => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) => !line.startsWith("#")).map((line) => {
    const [label, ...rest] = line.split("=");
    return { label: label.trim(), value: rest.join("=").trim() };
  }), [value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Parse a .env file into key-value pairs." inputArea={<ToolInput label=".env content"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function GitignoreGeneratorTool({ tool, ...shellProps }) {
  const [preset, setPreset] = useState("node");
  const output = useMemo(() => {
    const presets = {
      node: "node_modules/\ndist/\n.env\n.env.local\nnpm-debug.log*\n.DS_Store",
      python: "__pycache__/\n*.pyc\n.venv/\n.env\n.DS_Store",
      react: "node_modules/\ndist/\ncoverage/\n.env.local\n.DS_Store",
      general: ".DS_Store\nThumbs.db\n.env\n*.log\n.vscode/"
    };
    return presets[preset] || presets.general;
  }, [preset]);
  return miniTool(tool, shellProps, "Generate a starter .gitignore for a common project type.", <ToolInput label="Preset"><select value={preset} onChange={(e) => setPreset(e.target.value)}><option value="node">Node</option><option value="python">Python</option><option value="react">React</option><option value="general">General</option></select></ToolInput>, output);
}

export function SemanticVersionBumpTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("1.4.9");
  const items = useMemo(() => {
    const [major = 0, minor = 0, patch = 0] = value.split(".").map((item) => Number(item) || 0);
    return [
      { label: "Patch", value: `${major}.${minor}.${patch + 1}` },
      { label: "Minor", value: `${major}.${minor + 1}.0` },
      { label: "Major", value: `${major + 1}.0.0` }
    ];
  }, [value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Calculate semantic version bumps from a current x.y.z version." inputArea={<ToolInput label="Current version"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function BasicAuthHeaderGeneratorTool({ tool, ...shellProps }) {
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("secret");
  const output = useMemo(() => `Authorization: Basic ${btoa(`${username}:${password}`)}`, [password, username]);
  return miniTool(tool, shellProps, "Generate a Basic Authorization header from a username and password.", <><div className="split-fields"><ToolInput label="Username"><input value={username} onChange={(e) => setUsername(e.target.value)} /></ToolInput><ToolInput label="Password"><input value={password} onChange={(e) => setPassword(e.target.value)} /></ToolInput></div><ActionRow><button className="button button--secondary" onClick={() => { setUsername("demo"); setPassword("secret"); }} type="button">Reset</button></ActionRow></>, output);
}

export function JwtExpiryCheckerTool({ tool, ...shellProps }) {
  const [token, setToken] = useState("eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE5MDAwMDAwMDAsInN1YiI6ImRlbW8ifQ.signature");
  const items = useMemo(() => {
    try {
      const [, payload] = token.split(".");
      const parsed = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      const exp = Number(parsed.exp);
      const date = Number.isFinite(exp) ? new Date(exp * 1000) : null;
      return [
        { label: "Has exp claim", value: Number.isFinite(exp) ? "Yes" : "No" },
        { label: "Expiry", value: date ? date.toLocaleString() : "-" },
        { label: "Status", value: date ? (date.getTime() > Date.now() ? "Not expired" : "Expired") : "Unknown" }
      ];
    } catch {
      return [
        { label: "Has exp claim", value: "No" },
        { label: "Expiry", value: "-" },
        { label: "Status", value: "Invalid token" }
      ];
    }
  }, [token]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Decode a JWT payload and inspect its exp claim locally." inputArea={<><ToolInput label="JWT token"><textarea rows="10" value={token} onChange={(e) => setToken(e.target.value)} /></ToolInput><ActionRow><button className="button button--secondary" onClick={() => setToken("eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE5MDAwMDAwMDAsInN1YiI6ImRlbW8ifQ.signature")} type="button">Reset</button></ActionRow></>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}
