import { useEffect, useMemo, useRef, useState } from "react";
import { ActionRow, InlineMessage, KeyValueList, ResultPanel, ToolInput } from "../components/common";
import { CodeField, CodeResultPanel } from "../components/CodeEditor";
import { ToolShell } from "../components/ToolShell";
import { downloadIdeSource, getIdeLanguage, getIdeLanguages, ideDraftKey, runIdeCode } from "../lib/ideEngine";

export function OnlineIdeTool({ tool, ...shellProps }) {
  const languageOptions = useMemo(() => getIdeLanguages(), []);
  const initialLanguage = tool.defaultLanguage || "javascript";
  const [language, setLanguage] = useState(initialLanguage);
  const languageInfo = getIdeLanguage(language);
  const [code, setCode] = useState(languageInfo.starter);
  const [output, setOutput] = useState("Run code to see output, or use the IDE as a local syntax-highlighted editor.");
  const [status, setStatus] = useState("idle");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(ideDraftKey(language));
    setCode(saved || getIdeLanguage(language).starter);
    setOutput(`Editing ${getIdeLanguage(language).label} locally in your browser.`);
    setStatus("idle");
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(ideDraftKey(language), code);
  }, [code, language]);

  const details = [
    { label: "Language", value: languageInfo.label },
    { label: "Syntax highlighting", value: "Enabled" },
    { label: "Local draft save", value: "Enabled" },
    { label: "Execution", value: languageInfo.supportsRun ? "Browser-side JavaScript runner" : "Editing only" }
  ];

  const runCode = async () => {
    setStatus("running");
    const result = await runIdeCode(language, code);
    setStatus(result.ok ? "success" : "warning");
    setOutput(result.output);
  };

  const handleFilePick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCode(text);
  };

  tool.copyValue = () => code;

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Use the editor as a local browser IDE. Drafts stay on your device, syntax highlighting updates by language, and JavaScript can run in a local worker."
      validation={
        <InlineMessage tone={languageInfo.supportsRun ? "neutral" : "warning"}>
          {languageInfo.supportsRun
            ? "JavaScript runs in a local browser worker. Other listed languages currently use IDE editing mode only."
            : `${languageInfo.label} is available in local IDE editing mode. Execution is not enabled for this language yet.`}
        </InlineMessage>
      }
      inputArea={
        <>
          <div className="split-fields">
            <ToolInput label="Language">
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                {languageOptions.map((item) => (
                  <option key={item} value={item}>
                    {getIdeLanguage(item).label}
                  </option>
                ))}
              </select>
            </ToolInput>
            <ToolInput label="File extension">
              <input readOnly value={`.${languageInfo.extension}`} />
            </ToolInput>
          </div>
          <CodeField
            hint="The editor is lazy-loaded so it does not affect the rest of the site until a code tool or IDE page is opened."
            label={`${languageInfo.label} source`}
            language={languageInfo.editorLanguage}
            minHeight={420}
            onChange={setCode}
            value={code}
          />
          <ActionRow>
            <button className="button" onClick={runCode} type="button">
              {languageInfo.supportsRun ? "Run code" : "Show runtime note"}
            </button>
            <button className="button button--secondary" onClick={() => setCode(languageInfo.starter)} type="button">
              Reset starter
            </button>
            <button className="button button--secondary" onClick={() => downloadIdeSource(language, code)} type="button">
              Download file
            </button>
            <button className="button button--secondary" onClick={() => fileInputRef.current?.click()} type="button">
              Open local file
            </button>
            <input hidden onChange={handleFilePick} ref={fileInputRef} type="file" />
          </ActionRow>
        </>
      }
      outputArea={
        <div className="stack-sm">
          <CodeResultPanel language="markdown" minHeight={160} title="Console / runtime output" value={output} />
          <ResultPanel title="Workspace details">
            <KeyValueList items={details} />
          </ResultPanel>
        </div>
      }
      extra={
        <p>
          IDE drafts are saved locally per language in your browser storage. Opening this page lazy-loads the editor
          chunk, so the rest of Findtools does not pay the performance cost unless someone actually uses IDE or code tools.
        </p>
      }
    />
  );
}
