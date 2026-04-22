import { useMemo, useState } from "react";
import { ActionRow, InlineMessage, KeyValueList, ResultPanel, ToolInput } from "../components/common";
import { CodeField, CodeResultPanel } from "../components/CodeEditor";
import { ToolShell } from "../components/ToolShell";
import { codingLanguageEngine, getSupportedLanguages } from "../lib/codingLanguageEngine";
import {
  buildApiRequestPreview,
  buildArchitectureDiagram,
  buildCicdYaml,
  buildDependencyGraph,
  buildDockerfile,
  buildGitCommand,
  buildOpenApiSpec,
  buildReadme,
  compareTechnology,
  estimateMemoryUsage,
  estimateTimeComplexity,
  explainCode,
  formatStackTrace,
  parseSqlSchemaToOrm,
  prettifyLog,
  validateEnvFile
} from "../lib/toolLogic/codingTools";

function simpleTool(tool, shellProps, instructions, inputArea, outputArea, validation = null, extra = null) {
  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions={instructions}
      inputArea={inputArea}
      outputArea={outputArea}
      validation={validation}
      extra={extra}
    />
  );
}

function ResultText({ value, title, language }) {
  return language ? <CodeResultPanel language={language} title={title} value={value} /> : <ResultPanel title={title} value={value} />;
}

export function LanguageEngineTool({ tool, ...shellProps }) {
  const capability = tool.engineFunction || "format";
  const fallbackLanguage = tool.defaultLanguage || (capability === "minify" ? "javascript" : "typescript");
  const [language, setLanguage] = useState(fallbackLanguage);
  const [value, setValue] = useState(tool.sampleInput || "function hello(name){return name;}");
  const languages = tool.languageOptions || getSupportedLanguages(capability).map((item) => item.name);
  const output = useMemo(() => {
    if (capability === "validate") {
      const result = codingLanguageEngine.validate(value, language);
      return result.valid ? "Valid input" : result.errors.join("\n");
    }
    return capability === "minify"
      ? codingLanguageEngine.minify(value, language)
      : codingLanguageEngine.format(value, language);
  }, [capability, language, value]);
  const validation = capability === "validate"
    ? (() => {
        const result = codingLanguageEngine.validate(value, language);
        return <InlineMessage tone={result.valid ? "success" : "warning"}>{result.valid ? "Validation passed." : "Validation failed."}</InlineMessage>;
      })()
    : null;
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Choose a language and transform the code locally in your browser.",
    <>
      {languages.length > 1 ? (
        <ToolInput label="Language">
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            {languages.map((item) => (
              <option key={item} value={item}>
                {codingLanguageEngine.registry[item]?.label || item}
              </option>
            ))}
          </select>
        </ToolInput>
      ) : null}
      <CodeField label="Code input" language={language} minHeight={320} onChange={setValue} value={value} />
      <ActionRow>
        <button className="button button--secondary" onClick={() => setValue(tool.sampleInput || "")} type="button">
          Reset
        </button>
      </ActionRow>
    </>,
    <ResultText language={capability === "validate" ? "markdown" : language} title={capability === "validate" ? "Validation result" : "Output"} value={output} />,
    validation
  );
}

export function JsonModelGeneratorTool({ tool, ...shellProps }) {
  const [value, setValue] = useState('{"user":{"name":"Ava","active":true,"roles":["admin"]}}');
  const language = tool.defaultLanguage || "csharp";
  const output = useMemo(() => codingLanguageEngine.transform(value, "json", "model", language), [language, value]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    `Generate a ${codingLanguageEngine.registry[language]?.label || language} model from JSON.`,
    <CodeField label="JSON input" language="json" minHeight={320} onChange={setValue} value={value} />,
    <ResultText language={language} value={output} />
  );
}

export function SqlToOrmConverterTool({ tool, ...shellProps }) {
  const [schema, setSchema] = useState("CREATE TABLE users (\n  id INT,\n  name VARCHAR(255),\n  email VARCHAR(255)\n)");
  const [target, setTarget] = useState("prisma");
  const output = useMemo(() => parseSqlSchemaToOrm(schema, target), [schema, target]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Convert a simple CREATE TABLE statement into an ORM model.",
    <>
      <ToolInput label="ORM target">
        <select value={target} onChange={(event) => setTarget(event.target.value)}>
          <option value="prisma">Prisma</option>
          <option value="sqlalchemy">SQLAlchemy</option>
        </select>
      </ToolInput>
      <CodeField label="SQL schema" language="sql" minHeight={280} onChange={setSchema} value={schema} />
    </>,
    <ResultText language={target === "sqlalchemy" ? "python" : "javascript"} value={output} />
  );
}

export function GitCommandGeneratorTool({ tool, ...shellProps }) {
  const [intent, setIntent] = useState("status");
  const [branch, setBranch] = useState("feature/refactor");
  const [message, setMessage] = useState("Update files");
  const output = useMemo(() => buildGitCommand(intent, { branch, message }), [branch, intent, message]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Pick a common git task and generate the matching command.",
    <>
      <ToolInput label="Intent">
        <select value={intent} onChange={(event) => setIntent(event.target.value)}>
          <option value="status">Check status</option>
          <option value="branch">Create branch</option>
          <option value="commit">Commit changes</option>
          <option value="push">Push branch</option>
          <option value="undo-last-commit">Undo last commit</option>
          <option value="sync-main">Sync main</option>
        </select>
      </ToolInput>
      <div className="split-fields">
        <ToolInput label="Branch"><input value={branch} onChange={(event) => setBranch(event.target.value)} /></ToolInput>
        <ToolInput label="Message"><input value={message} onChange={(event) => setMessage(event.target.value)} /></ToolInput>
      </div>
    </>,
    <ResultText language="bash" value={output} />
  );
}

export function DockerfileGeneratorTool({ tool, ...shellProps }) {
  const [runtime, setRuntime] = useState("node");
  const [appType, setAppType] = useState("service");
  const [entrypoint, setEntrypoint] = useState("server.js");
  const output = useMemo(() => buildDockerfile(runtime, appType, entrypoint), [appType, entrypoint, runtime]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Generate a starter Dockerfile from a runtime and app type.",
    <>
      <div className="split-fields">
        <ToolInput label="Runtime">
          <select value={runtime} onChange={(event) => setRuntime(event.target.value)}>
            <option value="node">Node.js</option>
            <option value="python">Python</option>
            <option value="go">Go</option>
          </select>
        </ToolInput>
        <ToolInput label="App type">
          <select value={appType} onChange={(event) => setAppType(event.target.value)}>
            <option value="service">Service</option>
            <option value="static-site">Static site</option>
          </select>
        </ToolInput>
      </div>
      <ToolInput label="Entrypoint"><input value={entrypoint} onChange={(event) => setEntrypoint(event.target.value)} /></ToolInput>
    </>,
    <ResultText language="dockerfile" value={output} />
  );
}

export function CicdYamlGeneratorTool({ tool, ...shellProps }) {
  const [provider, setProvider] = useState("github");
  const [runtime, setRuntime] = useState("node");
  const [command, setCommand] = useState("npm ci && npm run test:run && npm run build");
  const output = useMemo(() => buildCicdYaml(provider, runtime, command), [command, provider, runtime]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Generate a starter CI/CD pipeline file for a common provider.",
    <>
      <div className="split-fields">
        <ToolInput label="Provider">
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="github">GitHub Actions</option>
            <option value="gitlab">GitLab CI</option>
            <option value="circleci">CircleCI</option>
          </select>
        </ToolInput>
        <ToolInput label="Runtime">
          <select value={runtime} onChange={(event) => setRuntime(event.target.value)}>
            <option value="node">Node.js</option>
            <option value="python">Python</option>
          </select>
        </ToolInput>
      </div>
      <ToolInput label="Run command"><input value={command} onChange={(event) => setCommand(event.target.value)} /></ToolInput>
    </>,
    <ResultText language="yaml" value={output} />
  );
}

export function EnvFileValidatorTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("APP_NAME=Findtools\nNODE_ENV=production\nAPI_KEY=demo-key");
  const result = useMemo(() => validateEnvFile(value), [value]);
  tool.copyValue = () => (result.valid ? result.items.map((item) => `${item.key}=${item.value}`).join("\n") : result.errors.join("\n"));
  return simpleTool(
    tool,
    shellProps,
    "Validate a .env file for duplicate keys and invalid names.",
    <CodeField label=".env content" language="bash" minHeight={280} onChange={setValue} value={value} />,
    result.valid
      ? <ResultPanel><KeyValueList items={result.items.map((item) => ({ label: item.key, value: item.value }))} /></ResultPanel>
      : <CodeResultPanel language="markdown" title="Validation errors" value={result.errors.join("\n")} />,
    <InlineMessage tone={result.valid ? "success" : "warning"}>{result.valid ? "Environment file looks valid." : "Validation issues were found."}</InlineMessage>
  );
}

export function StackTraceFormatterTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("at getUser (/app/src/user.js:14:9)\nat render (/app/src/view.js:28:3)");
  const items = useMemo(() => formatStackTrace(value), [value]);
  tool.copyValue = () => items.map((item) => `#${item.frame} ${item.functionName} ${item.file}:${item.line}:${item.column}`).join("\n");
  return simpleTool(
    tool,
    shellProps,
    "Parse a stack trace into a cleaner structured view.",
    <CodeField label="Stack trace" language="markdown" minHeight={280} onChange={setValue} value={value} />,
    <ResultPanel><KeyValueList items={items.flatMap((item) => [{ label: `Frame ${item.frame}`, value: `${item.functionName} — ${item.file}:${item.line}:${item.column}` }])} /></ResultPanel>
  );
}

export function LogPrettifierTool({ tool, ...shellProps }) {
  const [value, setValue] = useState('{"level":"info","message":"started","port":3000}\nlevel=warn msg="retrying" count=2');
  const output = useMemo(() => prettifyLog(value), [value]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Prettify JSON or key-value logs into readable blocks.",
    <CodeField label="Log input" language="json" minHeight={280} onChange={setValue} value={value} />,
    <ResultText language="json" value={output} />
  );
}

export function TimeComplexityEstimatorTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("for item in items:\n  for other in items:\n    print(item, other)");
  const result = useMemo(() => estimateTimeComplexity(value), [value]);
  tool.copyValue = () => `${result.complexity}\n${result.reason}`;
  return simpleTool(
    tool,
    shellProps,
    "Estimate time complexity heuristically from loop and recursion patterns.",
    <CodeField label="Code or pseudocode" language="python" minHeight={280} onChange={setValue} value={value} />,
    <ResultPanel><KeyValueList items={[{ label: "Estimated complexity", value: result.complexity }, { label: "Reason", value: result.reason }]} /></ResultPanel>
  );
}

export function MemoryUsageEstimatorTool({ tool, ...shellProps }) {
  const [itemCount, setItemCount] = useState("10000");
  const [averageBytes, setAverageBytes] = useState("128");
  const [overhead, setOverhead] = useState("0.2");
  const result = useMemo(() => estimateMemoryUsage(itemCount, averageBytes, overhead), [averageBytes, itemCount, overhead]);
  tool.copyValue = () => `${result.bytes.toFixed(0)} bytes\n${result.kb.toFixed(2)} KB\n${result.mb.toFixed(2)} MB`;
  return simpleTool(
    tool,
    shellProps,
    "Estimate memory usage from item count, size, and overhead.",
    <div className="split-fields">
      <ToolInput label="Item count"><input value={itemCount} onChange={(event) => setItemCount(event.target.value)} /></ToolInput>
      <ToolInput label="Average bytes per item"><input value={averageBytes} onChange={(event) => setAverageBytes(event.target.value)} /></ToolInput>
      <ToolInput label="Overhead ratio"><input value={overhead} onChange={(event) => setOverhead(event.target.value)} /></ToolInput>
    </div>,
    <ResultPanel><KeyValueList items={[{ label: "Bytes", value: result.bytes.toFixed(0) }, { label: "KB", value: result.kb.toFixed(2) }, { label: "MB", value: result.mb.toFixed(2) }]} /></ResultPanel>
  );
}

export function CodeSnippetRunnerTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("const nums = [1, 2, 3];\nconsole.log(nums.reduce((sum, item) => sum + item, 0));");
  const [output, setOutput] = useState("Run the snippet to see output.");
  const [status, setStatus] = useState("idle");

  const runSnippet = () => {
    setStatus("running");
    const workerSource = `
      self.onmessage = async (event) => {
        const logs = [];
        const console = { log: (...args) => logs.push(args.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(" ")) };
        try {
          const result = await (new Function("console", event.data.code))(console);
          self.postMessage({ ok: true, output: [...logs, result === undefined ? "" : String(result)].filter(Boolean).join("\\n") || "Snippet ran with no output." });
        } catch (error) {
          self.postMessage({ ok: false, output: error.message });
        }
      };
    `;
    const worker = new Worker(URL.createObjectURL(new Blob([workerSource], { type: "application/javascript" })));
    const timeoutId = window.setTimeout(() => {
      worker.terminate();
      setStatus("error");
      setOutput("Execution timed out after 2 seconds.");
    }, 2000);
    worker.onmessage = (event) => {
      window.clearTimeout(timeoutId);
      worker.terminate();
      setStatus(event.data.ok ? "success" : "error");
      setOutput(event.data.output);
    };
    worker.postMessage({ code: value });
  };

  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Run a small JavaScript snippet inside a browser worker sandbox.",
    <>
      <CodeField label="JavaScript snippet" language="javascript" minHeight={320} onChange={setValue} value={value} />
      <ActionRow>
        <button className="button" onClick={runSnippet} type="button">Run snippet</button>
      </ActionRow>
    </>,
    <ResultText language="markdown" value={output} />,
    <InlineMessage tone={status === "error" ? "warning" : status === "success" ? "success" : "neutral"}>
      {status === "running" ? "Running in a local worker…" : "Execution stays in your browser."}
    </InlineMessage>
  );
}

export function PseudocodeToCodeGeneratorTool({ tool, ...shellProps }) {
  const [language, setLanguage] = useState(tool.defaultLanguage || "javascript");
  const [value, setValue] = useState("IF total > 0 THEN\nPRINT total\nEND IF");
  const output = useMemo(() => codingLanguageEngine.transform(value, "pseudocode", "code", language), [language, value]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Convert simple structured pseudocode into runnable-looking code.",
    <>
      <ToolInput label="Target language">
        <select value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
        </select>
      </ToolInput>
      <CodeField label="Pseudocode" language="markdown" minHeight={280} onChange={setValue} value={value} />
    </>,
    <ResultText language={language} value={output} />
  );
}

export function CodeExplanationTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("function total(items) {\n  let sum = 0;\n  for (const item of items) {\n    sum += item.price;\n  }\n  return sum;\n}");
  const output = useMemo(() => explainCode(value), [value]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Generate a concise structural explanation of a code snippet.",
    <CodeField label="Code input" language="javascript" minHeight={320} onChange={setValue} value={value} />,
    <ResultText language="markdown" value={output} />
  );
}

export function ApiRequestBuilderTool({ tool, ...shellProps }) {
  const [method, setMethod] = useState("POST");
  const [url, setUrl] = useState("https://api.example.com/users");
  const [headers, setHeaders] = useState("Content-Type: application/json\nAuthorization: Bearer token");
  const [body, setBody] = useState('{"name":"Ava"}');
  const preview = useMemo(() => buildApiRequestPreview({ method, url, headers, body }), [body, headers, method, url]);
  tool.copyValue = () => `${preview.requestSummary}\n\n${preview.curl}\n\n${preview.fetch}`;
  return simpleTool(
    tool,
    shellProps,
    "Build and preview API requests without sending them anywhere.",
    <>
      <div className="split-fields">
        <ToolInput label="Method"><input value={method} onChange={(event) => setMethod(event.target.value)} /></ToolInput>
        <ToolInput label="URL"><input value={url} onChange={(event) => setUrl(event.target.value)} /></ToolInput>
      </div>
      <CodeField label="Headers" language="markdown" minHeight={160} onChange={setHeaders} value={headers} />
      <CodeField label="Body" language="json" minHeight={180} onChange={setBody} value={body} />
    </>,
    <ResultPanel><div className="stack-sm"><pre>{preview.requestSummary}</pre><CodeResultPanel language="bash" title="cURL" value={preview.curl} /><CodeResultPanel language="javascript" title="fetch()" value={preview.fetch} /></div></ResultPanel>
  );
}

export function OpenApiGeneratorTool({ tool, ...shellProps }) {
  const [title, setTitle] = useState("Demo API");
  const [version, setVersion] = useState("1.0.0");
  const [baseUrl, setBaseUrl] = useState("https://api.example.com");
  const [endpoints, setEndpoints] = useState("GET /users List users\nPOST /users Create user");
  const output = useMemo(() => buildOpenApiSpec({ title, version, baseUrl, endpoints }), [baseUrl, endpoints, title, version]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Generate a starter OpenAPI document from a short endpoint list.",
    <>
      <div className="split-fields">
        <ToolInput label="Title"><input value={title} onChange={(event) => setTitle(event.target.value)} /></ToolInput>
        <ToolInput label="Version"><input value={version} onChange={(event) => setVersion(event.target.value)} /></ToolInput>
      </div>
      <ToolInput label="Base URL"><input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} /></ToolInput>
      <CodeField label="Endpoints" language="markdown" minHeight={220} onChange={setEndpoints} value={endpoints} />
    </>,
    <ResultText language="yaml" value={output} />
  );
}

export function ReadmeGeneratorTool({ tool, ...shellProps }) {
  const [name, setName] = useState("Findtools Project");
  const [description, setDescription] = useState("A fast browser-based utility workspace.");
  const [install, setInstall] = useState("npm install");
  const [usage, setUsage] = useState("npm run dev");
  const [features, setFeatures] = useState("- Browser-only\n- Fast\n- Search-friendly");
  const output = useMemo(() => buildReadme({ name, description, install, usage, features }), [description, features, install, name, usage]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Generate a starter README from a few project inputs.",
    <>
      <ToolInput label="Project name"><input value={name} onChange={(event) => setName(event.target.value)} /></ToolInput>
      <ToolInput label="Description"><textarea rows="4" value={description} onChange={(event) => setDescription(event.target.value)} /></ToolInput>
      <div className="split-fields">
        <ToolInput label="Install command"><input value={install} onChange={(event) => setInstall(event.target.value)} /></ToolInput>
        <ToolInput label="Usage command"><input value={usage} onChange={(event) => setUsage(event.target.value)} /></ToolInput>
      </div>
      <CodeField label="Feature bullets" language="markdown" minHeight={160} onChange={setFeatures} value={features} />
    </>,
    <ResultText language="markdown" value={output} />
  );
}

export function DependencyGraphVisualizerTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("App -> API\nAPI -> Database\nAPI -> Cache");
  const output = useMemo(() => buildDependencyGraph(value), [value]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Generate a Mermaid dependency graph from one edge per line.",
    <CodeField label="Dependency edges" language="markdown" minHeight={220} onChange={setValue} value={value} />,
    <ResultText language="markdown" title="Mermaid graph" value={output} />
  );
}

export function ArchitectureDiagramGeneratorTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("Browser -> Web App\nWeb App -> API\nAPI -> Database");
  const output = useMemo(() => buildArchitectureDiagram(value), [value]);
  tool.copyValue = () => output;
  return simpleTool(
    tool,
    shellProps,
    "Generate a simple Mermaid architecture diagram from service relationships.",
    <CodeField label="System edges" language="markdown" minHeight={220} onChange={setValue} value={value} />,
    <ResultText language="markdown" title="Mermaid diagram" value={output} />
  );
}

export function TechnologyComparisonTool({ tool, ...shellProps }) {
  const comparisonType = tool.comparisonType || "language";
  const defaults = {
    language: ["javascript", "python"],
    framework: ["react", "vue"],
    database: ["postgres", "mongodb"]
  };
  const [choices, setChoices] = useState(defaults[comparisonType].join("\n"));
  const results = useMemo(() => compareTechnology(comparisonType, choices.split(/\r?\n/).map((item) => item.trim().toLowerCase())), [choices, comparisonType]);
  tool.copyValue = () => JSON.stringify(results, null, 2);
  return simpleTool(
    tool,
    shellProps,
    "Compare common technology options from a small built-in reference dataset.",
    <ToolInput label="Options (one per line)"><textarea rows="8" value={choices} onChange={(event) => setChoices(event.target.value)} /></ToolInput>,
    <ResultPanel>
      <div className="stack-sm">
        {results.map((item) => (
          <div key={item.name}>
            <strong>{item.name}</strong>
            <KeyValueList items={Object.entries(item).filter(([key]) => key !== "name").map(([label, value]) => ({ label, value }))} />
          </div>
        ))}
      </div>
    </ResultPanel>
  );
}
