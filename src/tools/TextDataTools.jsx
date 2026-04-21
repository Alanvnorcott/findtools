import { useMemo, useState } from "react";
import { ActionRow, InlineMessage, KeyValueList, ResultPanel, ToolInput } from "../components/common";
import { ToolShell } from "../components/ToolShell";
import { parseCsv, stringifyCsv } from "../lib/csv";
import { countTextStats, csvToJsonText, extractEmailDomains, jsonToCsvText, removePunctuation, sentenceCase } from "../lib/toolLogic/textData";

function textState(initialValue = "") {
  const [value, setValue] = useState(initialValue);
  return { value, setValue, clear: () => setValue(""), reset: () => setValue(initialValue) };
}

function baseActions(config) {
  return (
    <ActionRow>
      {config.sample ? (
        <button className="button button--secondary" onClick={config.sample} type="button">
          Sample
        </button>
      ) : null}
      <button className="button button--secondary" onClick={config.clear} type="button">
        Clear
      </button>
      <button className="button" onClick={config.reset} type="button">
        Reset
      </button>
    </ActionRow>
  );
}

export function JsonFormatterTool({ tool, ...shellProps }) {
  const state = textState('{"name":"Findtools","quiet":true,"categories":["text","files"]}');
  const [indent, setIndent] = useState(2);
  const parsed = useMemo(() => {
    try {
      return { ok: true, text: JSON.stringify(JSON.parse(state.value), null, indent) };
    } catch (error) {
      return { ok: false, text: "", error: error.message };
    }
  }, [indent, state.value]);
  tool.copyValue = () => parsed.text;

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Paste JSON and format it with consistent indentation."
      validation={!parsed.ok ? <InlineMessage tone="error">{parsed.error}</InlineMessage> : null}
      inputArea={
        <>
          <ToolInput label="Indentation">
            <select value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
            </select>
          </ToolInput>
          <ToolInput label="JSON input">
            <textarea rows="16" value={state.value} onChange={(e) => state.setValue(e.target.value)} />
          </ToolInput>
          {baseActions({
            clear: state.clear,
            reset: state.reset,
            sample: () => state.setValue('{"name":"Findtools","quiet":true,"categories":["text","files"]}')
          })}
        </>
      }
      outputArea={<ResultPanel value={parsed.text} placeholder="Valid formatted JSON will appear here." />}
    />
  );
}

export function JsonValidatorTool({ tool, ...shellProps }) {
  const state = textState('{"valid": true, "items": 3}');
  const result = useMemo(() => {
    try {
      const parsed = JSON.parse(state.value);
      return {
        ok: true,
        title: "JSON is valid.",
        items: [
          { label: "Type", value: Array.isArray(parsed) ? "array" : typeof parsed },
          { label: "Keys", value: typeof parsed === "object" && parsed !== null ? String(Object.keys(parsed).length) : "0" }
        ]
      };
    } catch (error) {
      return { ok: false, title: error.message, items: [] };
    }
  }, [state.value]);
  tool.copyValue = () => [result.title, ...result.items.map((item) => `${item.label}: ${item.value}`)].join("\n");

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Validate JSON syntax and inspect the parsed shape."
      validation={<InlineMessage tone={result.ok ? "success" : "error"}>{result.ok ? "JSON is valid." : "JSON is invalid."}</InlineMessage>}
      inputArea={
        <>
          <ToolInput label="JSON input">
            <textarea rows="16" value={state.value} onChange={(e) => state.setValue(e.target.value)} />
          </ToolInput>
          {baseActions({ clear: state.clear, reset: state.reset, sample: () => state.setValue('{"valid": true, "items": 3}') })}
        </>
      }
      outputArea={<ResultPanel><div className="stack-sm"><pre>{result.title}</pre>{result.items.length ? <KeyValueList items={result.items} /> : null}</div></ResultPanel>}
    />
  );
}

export function JsonMinifierTool({ tool, ...shellProps }) {
  const state = textState('{\n  "name": "Findtools",\n  "local": true\n}');
  const output = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(state.value));
    } catch {
      return "";
    }
  }, [state.value]);
  tool.copyValue = () => output;

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Strip whitespace from valid JSON."
      validation={!output && state.value ? <InlineMessage tone="error">Enter valid JSON to minify.</InlineMessage> : null}
      inputArea={
        <>
          <ToolInput label="JSON input"><textarea rows="16" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>
          {baseActions({ clear: state.clear, reset: state.reset })}
        </>
      }
      outputArea={<ResultPanel value={output} placeholder="Minified JSON will appear here." />}
    />
  );
}

export function CsvCleanerTool({ tool, ...shellProps }) {
  const sample = "name,email,team\n Ava , ava@example.com , Product \nBen,ben@example.com,Engineering";
  const state = textState(sample);
  const [trimCells, setTrimCells] = useState(true);
  const [dropEmptyRows, setDropEmptyRows] = useState(true);
  const cleaned = useMemo(() => {
    const rows = parseCsv(state.value)
      .map((row) => row.map((cell) => (trimCells ? cell.trim() : cell)))
      .filter((row) => !dropEmptyRows || row.some((cell) => cell.trim() !== ""));
    return stringifyCsv(rows);
  }, [dropEmptyRows, state.value, trimCells]);
  tool.copyValue = () => cleaned;

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Trim cells and remove empty rows from CSV data."
      inputArea={
        <>
          <div className="toggle-row">
            <label><input checked={trimCells} onChange={() => setTrimCells((v) => !v)} type="checkbox" /> Trim whitespace</label>
            <label><input checked={dropEmptyRows} onChange={() => setDropEmptyRows((v) => !v)} type="checkbox" /> Remove empty rows</label>
          </div>
          <ToolInput label="CSV input"><textarea rows="16" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>
          {baseActions({ clear: state.clear, reset: state.reset, sample: () => state.setValue(sample) })}
        </>
      }
      outputArea={<ResultPanel value={cleaned} placeholder="Clean CSV will appear here." />}
    />
  );
}

export function RemoveDuplicatesTool({ tool, ...shellProps }) {
  const sample = "Design\nEngineering\nDesign\nMarketing\nEngineering";
  const state = textState(sample);
  const result = useMemo(() => [...new Set(state.value.split(/\r?\n/).filter(Boolean))].join("\n"), [state.value]);
  tool.copyValue = () => result;

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Remove duplicate lines and keep the first occurrence."
      inputArea={
        <>
          <ToolInput label="List input"><textarea rows="16" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>
          {baseActions({ clear: state.clear, reset: state.reset, sample: () => state.setValue(sample) })}
        </>
      }
      outputArea={<ResultPanel value={result} />}
    />
  );
}

export function RemoveDuplicateWordsTool({ tool, ...shellProps }) {
  const state = textState("quiet quiet utility workspace workspace tools");
  const output = useMemo(() => [...new Set(state.value.trim().split(/\s+/).filter(Boolean))].join(" "), [state.value]);
  tool.copyValue = () => output;
  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Remove repeated words while keeping first appearance order."
      inputArea={
        <>
          <ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>
          {baseActions({ clear: state.clear, reset: state.reset })}
        </>
      }
      outputArea={<ResultPanel value={output} />}
    />
  );
}

function lineDiff(left, right) {
  const leftLines = left.split(/\r?\n/);
  const rightLines = right.split(/\r?\n/);
  const max = Math.max(leftLines.length, rightLines.length);
  return Array.from({ length: max }, (_, index) => {
    const a = leftLines[index] ?? "";
    const b = rightLines[index] ?? "";
    return { type: a === b ? "same" : "changed", left: a, right: b };
  });
}

export function TextDiffTool({ tool, ...shellProps }) {
  const [left, setLeft] = useState("Line one\nLine two\nLine four");
  const [right, setRight] = useState("Line one\nLine 2\nLine four");
  const diff = useMemo(() => lineDiff(left, right), [left, right]);
  tool.copyValue = () => diff.map((row) => `${row.type === "changed" ? "!=" : "=="} ${row.left} | ${row.right}`).join("\n");

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Compare two blocks of text line by line."
      inputArea={
        <>
          <div className="split-fields">
            <ToolInput label="Left text"><textarea rows="16" value={left} onChange={(e) => setLeft(e.target.value)} /></ToolInput>
            <ToolInput label="Right text"><textarea rows="16" value={right} onChange={(e) => setRight(e.target.value)} /></ToolInput>
          </div>
          <ActionRow>
            <button className="button button--secondary" onClick={() => { setLeft(""); setRight(""); }} type="button">Clear</button>
            <button className="button" onClick={() => { setLeft("Line one\nLine two\nLine four"); setRight("Line one\nLine 2\nLine four"); }} type="button">Reset</button>
          </ActionRow>
        </>
      }
      outputArea={
        <div className="diff-panel">
          <div className="result-panel__label">{diff.filter((row) => row.type === "changed").length} changed lines</div>
          {diff.map((row, index) => (
            <div className={`diff-row diff-row--${row.type}`} key={`${index}-${row.left}-${row.right}`}>
              <span>{row.left || " "}</span>
              <span>{row.right || " "}</span>
            </div>
          ))}
        </div>
      }
    />
  );
}

export function CompareJsonFilesTool({ tool, ...shellProps }) {
  const [left, setLeft] = useState('{"name":"Findtools","local":true}');
  const [right, setRight] = useState('{"name":"Findtools","local":false}');
  const formatted = useMemo(() => {
    try {
      return {
        left: JSON.stringify(JSON.parse(left), null, 2),
        right: JSON.stringify(JSON.parse(right), null, 2)
      };
    } catch {
      return { left, right };
    }
  }, [left, right]);
  const diff = useMemo(() => lineDiff(formatted.left, formatted.right), [formatted.left, formatted.right]);
  tool.copyValue = () => diff.map((row) => `${row.type}: ${row.left} | ${row.right}`).join("\n");

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Compare two JSON values after formatting them into a stable structure."
      inputArea={
        <>
          <div className="split-fields">
            <ToolInput label="Left JSON"><textarea rows="16" value={left} onChange={(e) => setLeft(e.target.value)} /></ToolInput>
            <ToolInput label="Right JSON"><textarea rows="16" value={right} onChange={(e) => setRight(e.target.value)} /></ToolInput>
          </div>
          <ActionRow>
            <button className="button button--secondary" onClick={() => { setLeft(""); setRight(""); }} type="button">Clear</button>
            <button className="button" onClick={() => { setLeft('{"name":"Findtools","local":true}'); setRight('{"name":"Findtools","local":false}'); }} type="button">Reset</button>
          </ActionRow>
        </>
      }
      outputArea={
        <div className="diff-panel">
          <div className="result-panel__label">{diff.filter((row) => row.type === "changed").length} changed lines</div>
          {diff.map((row, index) => (
            <div className={`diff-row diff-row--${row.type}`} key={`${index}-${row.left}-${row.right}`}>
              <span>{row.left || " "}</span>
              <span>{row.right || " "}</span>
            </div>
          ))}
        </div>
      }
    />
  );
}

export function WordCounterTool({ tool, ...shellProps }) {
  const sample = "A calm workspace should stay out of your way while you work.";
  const state = textState(sample);
  const stats = useMemo(() => {
    const counts = countTextStats(state.value);
    return [
      { label: "Words", value: String(counts.words) },
      { label: "Characters", value: String(counts.characters) },
      { label: "Characters without spaces", value: String(counts.charactersWithoutSpaces) },
      { label: "Lines", value: String(counts.lines) }
    ];
  }, [state.value]);
  tool.copyValue = () => stats.map((item) => `${item.label}: ${item.value}`).join("\n");

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Count words, characters, and lines instantly."
      inputArea={
        <>
          <ToolInput label="Text input"><textarea rows="16" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>
          {baseActions({ clear: state.clear, reset: state.reset, sample: () => state.setValue(sample) })}
        </>
      }
      outputArea={<ResultPanel><KeyValueList items={stats} /></ResultPanel>}
    />
  );
}

export function WordFrequencyCounterTool({ tool, ...shellProps }) {
  const state = textState("quiet tools make quiet work feel lighter");
  const items = useMemo(() => {
    const counts = new Map();
    state.value
      .toLowerCase()
      .match(/[a-z0-9']+/g)?.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, value: String(count) }));
  }, [state.value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Count repeated words and sort by frequency."
      inputArea={
        <>
          <ToolInput label="Text input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>
          {baseActions({ clear: state.clear, reset: state.reset })}
        </>
      }
      outputArea={<ResultPanel><KeyValueList items={items.slice(0, 40)} /></ResultPanel>}
    />
  );
}

export function CaseConverterTool({ tool, ...shellProps }) {
  const sample = "Swiss Army Knife Workspace";
  const initialMode = tool.slug.includes("lowercase") ? "lower" : tool.slug.includes("uppercase") ? "upper" : "lower";
  const state = textState(sample);
  const [mode, setMode] = useState(initialMode);
  const output = useMemo(() => {
    switch (mode) {
      case "upper":
        return state.value.toUpperCase();
      case "title":
        return state.value.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
      case "camel": {
        const words = state.value.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
        return words.map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))).join("");
      }
      case "snake":
        return state.value.toLowerCase().trim().split(/[^a-z0-9]+/i).filter(Boolean).join("_");
      default:
        return state.value.toLowerCase();
    }
  }, [mode, state.value]);
  tool.copyValue = () => output;

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Convert text between common casing styles."
      inputArea={
        <>
          <ToolInput label="Conversion mode">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="lower">lowercase</option>
              <option value="upper">UPPERCASE</option>
              <option value="title">Title Case</option>
              <option value="camel">camelCase</option>
              <option value="snake">snake_case</option>
            </select>
          </ToolInput>
          <ToolInput label="Text input"><textarea rows="16" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>
          {baseActions({ clear: state.clear, reset: state.reset, sample: () => state.setValue(sample) })}
        </>
      }
      outputArea={<ResultPanel value={output} />}
    />
  );
}

export function WhitespaceRemoverTool({ tool, ...shellProps }) {
  const state = textState("  calm    tools   \n  less   noise ");
  const [mode, setMode] = useState("trim-lines");
  const output = useMemo(() => {
    if (mode === "all") return state.value.replace(/\s+/g, "");
    if (mode === "collapse") return state.value.replace(/\s+/g, " ").trim();
    return state.value.split(/\r?\n/).map((line) => line.trim()).join("\n");
  }, [mode, state.value]);
  tool.copyValue = () => output;

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Trim line edges, collapse whitespace, or remove whitespace completely."
      inputArea={
        <>
          <ToolInput label="Mode">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="trim-lines">Trim each line</option>
              <option value="collapse">Collapse repeated whitespace</option>
              <option value="all">Remove all whitespace</option>
            </select>
          </ToolInput>
          <ToolInput label="Text input"><textarea rows="16" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>
          {baseActions({ clear: state.clear, reset: state.reset })}
        </>
      }
      outputArea={<ResultPanel value={output} />}
    />
  );
}

export function TextSorterTool({ tool, ...shellProps }) {
  const state = textState("delta\nbravo\ncharlie\nalpha");
  const [direction, setDirection] = useState("asc");
  const output = useMemo(() => state.value.split(/\r?\n/).filter(Boolean).sort((a, b) => direction === "asc" ? a.localeCompare(b) : b.localeCompare(a)).join("\n"), [direction, state.value]);
  tool.copyValue = () => output;
  return (
    <ToolShell {...shellProps} tool={tool} instructions="Sort lines alphabetically in either direction." inputArea={<><ToolInput label="Direction"><select value={direction} onChange={(e) => setDirection(e.target.value)}><option value="asc">A to Z</option><option value="desc">Z to A</option></select></ToolInput><ToolInput label="Lines"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />
  );
}

export function TextReverserTool({ tool, ...shellProps }) {
  const state = textState("Findtools");
  const output = useMemo(() => state.value.split("").reverse().join(""), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Reverse the text exactly as entered." inputArea={<><ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function LineNumberAdderTool({ tool, ...shellProps }) {
  const state = textState("first line\nsecond line\nthird line");
  const output = useMemo(() => state.value.split(/\r?\n/).map((line, index) => `${index + 1}. ${line}`).join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Prefix each line with a number." inputArea={<><ToolInput label="Text input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function LineNumberRemoverTool({ tool, ...shellProps }) {
  const state = textState("1. first line\n2. second line\n3. third line");
  const output = useMemo(() => state.value.replace(/^\s*\d+[\).\-\s]*/gm, ""), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove common line-number prefixes." inputArea={<><ToolInput label="Text input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function RemoveEmptyLinesTool({ tool, ...shellProps }) {
  const state = textState("alpha\n\nbravo\n\ncharlie");
  const output = useMemo(() => state.value.split(/\r?\n/).filter((line) => line.trim() !== "").join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove blank lines from text." inputArea={<><ToolInput label="Text input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function ExtractEmailsTool({ tool, ...shellProps }) {
  const state = textState("Contact ava@example.com or ben@findtools.dev for help.");
  const output = useMemo(() => [...new Set(state.value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])].join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract email addresses from mixed text." inputArea={<><ToolInput label="Text input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="Email addresses will appear here." />} />;
}

export function ExtractUrlsTool({ tool, ...shellProps }) {
  const state = textState("Docs: https://example.com/docs and http://localhost:3000/test");
  const output = useMemo(() => [...new Set(state.value.match(/https?:\/\/[^\s)]+/g) || [])].join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract URLs from a block of text." inputArea={<><ToolInput label="Text input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="URLs will appear here." />} />;
}

export function SentenceCounterTool({ tool, ...shellProps }) {
  const state = textState("Quiet tools help teams move faster. Clear interfaces help them stay there.");
  const count = useMemo(() => (state.value.match(/[.!?]+(\s|$)/g) || []).length, [state.value]);
  tool.copyValue = () => `Sentences: ${count}`;
  return <ToolShell {...shellProps} tool={tool} instructions="Count sentences in a block of text." inputArea={<><ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={[{ label: "Sentences", value: String(count) }]} /></ResultPanel>} />;
}

export function ParagraphCounterTool({ tool, ...shellProps }) {
  const state = textState("First paragraph.\n\nSecond paragraph.\n\nThird paragraph.");
  const count = useMemo(() => state.value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean).length, [state.value]);
  tool.copyValue = () => `Paragraphs: ${count}`;
  return <ToolShell {...shellProps} tool={tool} instructions="Count paragraphs separated by blank lines." inputArea={<><ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={[{ label: "Paragraphs", value: String(count) }]} /></ResultPanel>} />;
}

export function ReadingTimeTool({ tool, ...shellProps }) {
  const state = textState("A calm workspace should stay out of the way while people focus on the work itself.");
  const stats = useMemo(() => {
    const words = state.value.trim() ? state.value.trim().split(/\s+/).length : 0;
    const minutes = words / 200;
    return [
      { label: "Words", value: String(words) },
      { label: "Reading time", value: `${Math.max(1, Math.ceil(minutes))} min` }
    ];
  }, [state.value]);
  tool.copyValue = () => stats.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Estimate reading time using a 200 words per minute pace." inputArea={<><ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={stats} /></ResultPanel>} />;
}

export function SlugGeneratorTool({ tool, ...shellProps }) {
  const state = textState("Findtools Practical Utility Workspace");
  const output = useMemo(() => state.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Convert text into a URL-friendly slug." inputArea={<><ToolInput label="Text input"><textarea rows="8" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function DuplicateLinesFinderTool({ tool, ...shellProps }) {
  const state = textState("design\nops\ndesign\nproduct\nops\nops");
  const output = useMemo(() => {
    const counts = new Map();
    state.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => counts.set(line, (counts.get(line) || 0) + 1));
    return [...counts.entries()].filter(([, count]) => count > 1).map(([line, count]) => `${line} (${count})`).join("\n");
  }, [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Find duplicate lines and show how many times each one appears." inputArea={<><ToolInput label="List input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="Duplicate lines will appear here." />} />;
}

export function UniqueLineCounterTool({ tool, ...shellProps }) {
  const state = textState("design\nops\ndesign\nproduct\nops");
  const items = useMemo(() => {
    const lines = state.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return [
      { label: "Total lines", value: String(lines.length) },
      { label: "Unique lines", value: String(new Set(lines).size) }
    ];
  }, [state.value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Count total lines and unique lines." inputArea={<><ToolInput label="List input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function TextReplaceTool({ tool, ...shellProps }) {
  const state = textState("quiet tools make quiet work calmer");
  const [find, setFind] = useState("quiet");
  const [replace, setReplace] = useState("focused");
  const output = useMemo(() => {
    if (!find) return state.value;
    return state.value.split(find).join(replace);
  }, [find, replace, state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Replace exact text matches across the input." inputArea={<><div className="split-fields"><ToolInput label="Find"><input value={find} onChange={(e) => setFind(e.target.value)} /></ToolInput><ToolInput label="Replace with"><input value={replace} onChange={(e) => setReplace(e.target.value)} /></ToolInput></div><ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function CharacterCounterTool({ tool, ...shellProps }) {
  const state = textState("Findtools");
  const items = useMemo(() => [{ label: "Characters", value: String(state.value.length) }, { label: "Characters without spaces", value: String(state.value.replace(/\s/g, "").length) }], [state.value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Count total characters in the input." inputArea={<><ToolInput label="Text input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function NumberSorterTool({ tool, ...shellProps }) {
  const state = textState("10\n2\n42\n7\n18");
  const [direction, setDirection] = useState("asc");
  const output = useMemo(() => {
    const sorted = state.value
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => (direction === "asc" ? a - b : b - a));
    return sorted.join("\n");
  }, [direction, state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Sort one number per line in ascending or descending order." inputArea={<><ToolInput label="Sort direction"><select value={direction} onChange={(e) => setDirection(e.target.value)}><option value="asc">Ascending</option><option value="desc">Descending</option></select></ToolInput><ToolInput label="Numbers"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function ReverseLineOrderTool({ tool, ...shellProps }) {
  const state = textState("alpha\nbravo\ncharlie");
  const output = useMemo(() => state.value.split(/\r?\n/).reverse().join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Reverse the order of lines without changing each line's text." inputArea={<><ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function CollapseSpacesTool({ tool, ...shellProps }) {
  const state = textState("Findtools    keeps   spacing   practical.");
  const output = useMemo(() => state.value.replace(/[ \t]+/g, " ").trim(), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Collapse repeated spaces and tabs into single spaces." inputArea={<><ToolInput label="Text input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function TabsToSpacesTool({ tool, ...shellProps }) {
  const state = textState("name\trole\tteam");
  const [spaces, setSpaces] = useState("2");
  const output = useMemo(() => state.value.replace(/\t/g, " ".repeat(Math.max(0, Number(spaces) || 0))), [spaces, state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Replace tab characters with a chosen number of spaces." inputArea={<><ToolInput label="Spaces per tab"><input value={spaces} onChange={(e) => setSpaces(e.target.value)} /></ToolInput><ToolInput label="Text input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function SpacesToTabsTool({ tool, ...shellProps }) {
  const state = textState("name  role  team");
  const [spaces, setSpaces] = useState("2");
  const output = useMemo(() => {
    const count = Math.max(1, Number(spaces) || 1);
    return state.value.replace(new RegExp(` {${count}}`, "g"), "\t");
  }, [spaces, state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Replace repeated spaces with tab characters." inputArea={<><ToolInput label="Spaces to replace"><input value={spaces} onChange={(e) => setSpaces(e.target.value)} /></ToolInput><ToolInput label="Text input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function CsvColumnCounterTool({ tool, ...shellProps }) {
  const state = textState("name,email,team\nAva,ava@example.com,Product\nBen,ben@example.com,Engineering");
  const items = useMemo(() => {
    const rows = parseCsv(state.value);
    const widest = rows.reduce((max, row) => Math.max(max, row.length), 0);
    return [
      { label: "Rows", value: String(rows.length) },
      { label: "Columns in header", value: String(rows[0]?.length || 0) },
      { label: "Widest row", value: String(widest) }
    ];
  }, [state.value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Count rows and columns in CSV input." inputArea={<><ToolInput label="CSV input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function FirstLineExtractorTool({ tool, ...shellProps }) {
  const state = textState("alpha\nbravo\ncharlie");
  const output = useMemo(() => state.value.split(/\r?\n/).find((line) => line.trim() !== "") || "", [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract the first non-empty line from a block of text." inputArea={<><ToolInput label="Text input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="First non-empty line will appear here." />} />;
}

export function LastLineExtractorTool({ tool, ...shellProps }) {
  const state = textState("alpha\nbravo\ncharlie");
  const output = useMemo(() => [...state.value.split(/\r?\n/)].reverse().find((line) => line.trim() !== "") || "", [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract the last non-empty line from a block of text." inputArea={<><ToolInput label="Text input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="Last non-empty line will appear here." />} />;
}

export function CsvToJsonTool({ tool, ...shellProps }) {
  const state = textState("name,email,team\nAva,ava@example.com,Product\nBen,ben@example.com,Engineering");
  const output = useMemo(() => {
    try {
      return csvToJsonText(state.value);
    } catch (error) {
      return `Invalid CSV: ${error.message}`;
    }
  }, [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Convert CSV rows into a JSON array using the first row as headers." inputArea={<><ToolInput label="CSV input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function JsonToCsvTool({ tool, ...shellProps }) {
  const state = textState('[{"name":"Ava","team":"Product"},{"name":"Ben","team":"Engineering"}]');
  const output = useMemo(() => {
    try {
      return jsonToCsvText(state.value);
    } catch (error) {
      return `Invalid JSON: ${error.message}`;
    }
  }, [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Convert a JSON object array into CSV using combined object keys as headers." inputArea={<><ToolInput label="JSON input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function CsvColumnExtractorTool({ tool, ...shellProps }) {
  const state = textState("name,email,team\nAva,ava@example.com,Product\nBen,ben@example.com,Engineering");
  const [column, setColumn] = useState("email");
  const output = useMemo(() => {
    const [header = [], ...rows] = parseCsv(state.value);
    const index = Number.isFinite(Number(column)) ? Number(column) : header.indexOf(column);
    return rows.map((row) => row[index] ?? "").filter(Boolean).join("\n");
  }, [column, state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract one CSV column by header name or zero-based index." inputArea={<><ToolInput label="Column name or index"><input value={column} onChange={(e) => setColumn(e.target.value)} /></ToolInput><ToolInput label="CSV input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function CsvColumnRenamerTool({ tool, ...shellProps }) {
  const state = textState("name,email,team\nAva,ava@example.com,Product");
  const [from, setFrom] = useState("team");
  const [to, setTo] = useState("department");
  const output = useMemo(() => {
    const [header = [], ...rows] = parseCsv(state.value);
    const nextHeader = header.map((cell) => (cell === from ? to : cell));
    return stringifyCsv([nextHeader, ...rows]);
  }, [from, state.value, to]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Rename a CSV header without changing the row data." inputArea={<><div className="split-fields"><ToolInput label="Rename from"><input value={from} onChange={(e) => setFrom(e.target.value)} /></ToolInput><ToolInput label="Rename to"><input value={to} onChange={(e) => setTo(e.target.value)} /></ToolInput></div><ToolInput label="CSV input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function CsvDelimiterConverterTool({ tool, ...shellProps }) {
  const state = textState("name,email,team\nAva,ava@example.com,Product");
  const [delimiter, setDelimiter] = useState(";");
  const output = useMemo(() => parseCsv(state.value).map((row) => row.join(delimiter)).join("\n"), [delimiter, state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Convert CSV commas into another delimiter such as semicolon, tab, or pipe." inputArea={<><ToolInput label="Target delimiter"><input value={delimiter} onChange={(e) => setDelimiter(e.target.value)} /></ToolInput><ToolInput label="CSV input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function CsvTransposeTool({ tool, ...shellProps }) {
  const state = textState("name,email,team\nAva,ava@example.com,Product\nBen,ben@example.com,Engineering");
  const output = useMemo(() => {
    const rows = parseCsv(state.value);
    const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
    return stringifyCsv(Array.from({ length: width }, (_, columnIndex) => rows.map((row) => row[columnIndex] ?? "")));
  }, [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Transpose CSV rows and columns." inputArea={<><ToolInput label="CSV input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function CsvDedupeByColumnTool({ tool, ...shellProps }) {
  const state = textState("name,email,team\nAva,ava@example.com,Product\nAva,ava@example.com,Product\nBen,ben@example.com,Engineering");
  const [column, setColumn] = useState("email");
  const output = useMemo(() => {
    const [header = [], ...rows] = parseCsv(state.value);
    const index = Number.isFinite(Number(column)) ? Number(column) : header.indexOf(column);
    const seen = new Set();
    const deduped = rows.filter((row) => {
      const key = row[index] ?? "";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return stringifyCsv([header, ...deduped]);
  }, [column, state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove duplicate CSV rows based on one column value." inputArea={<><ToolInput label="Column name or index"><input value={column} onChange={(e) => setColumn(e.target.value)} /></ToolInput><ToolInput label="CSV input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function CsvMergeColumnsTool({ tool, ...shellProps }) {
  const state = textState("first,last,email\nAva,Hill,ava@example.com\nBen,Stone,ben@example.com");
  const [leftColumn, setLeftColumn] = useState("first");
  const [rightColumn, setRightColumn] = useState("last");
  const [targetColumn, setTargetColumn] = useState("full_name");
  const [separator, setSeparator] = useState(" ");
  const output = useMemo(() => {
    const [header = [], ...rows] = parseCsv(state.value);
    const leftIndex = header.indexOf(leftColumn);
    const rightIndex = header.indexOf(rightColumn);
    const nextHeader = [...header, targetColumn];
    const nextRows = rows.map((row) => [...row, `${row[leftIndex] ?? ""}${separator}${row[rightIndex] ?? ""}`.trim()]);
    return stringifyCsv([nextHeader, ...nextRows]);
  }, [leftColumn, rightColumn, separator, state.value, targetColumn]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Merge two CSV columns into a new output column." inputArea={<><div className="split-fields"><ToolInput label="First column"><input value={leftColumn} onChange={(e) => setLeftColumn(e.target.value)} /></ToolInput><ToolInput label="Second column"><input value={rightColumn} onChange={(e) => setRightColumn(e.target.value)} /></ToolInput></div><div className="split-fields"><ToolInput label="New column name"><input value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)} /></ToolInput><ToolInput label="Separator"><input value={separator} onChange={(e) => setSeparator(e.target.value)} /></ToolInput></div><ToolInput label="CSV input"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function PhoneNumberExtractorTool({ tool, ...shellProps }) {
  const state = textState("Call (555) 120-9988 or 555-223-1099 today.");
  const output = useMemo(() => (state.value.match(/(?:\+?\d{1,2}\s*)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/g) || []).join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract phone numbers from mixed text." inputArea={<><ToolInput label="Text input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="Phone numbers will appear here." />} />;
}

export function HashtagExtractorTool({ tool, ...shellProps }) {
  const state = textState("Useful for #seo, #content, and #Findtools workflows.");
  const output = useMemo(() => (state.value.match(/#[\p{L}\p{N}_-]+/gu) || []).join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract hashtags from text." inputArea={<><ToolInput label="Text input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="Hashtags will appear here." />} />;
}

export function MentionExtractorTool({ tool, ...shellProps }) {
  const state = textState("Ping @ava and @ben.smith about the release.");
  const output = useMemo(() => (state.value.match(/@[\w.-]+/g) || []).join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract @mentions from text." inputArea={<><ToolInput label="Text input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="Mentions will appear here." />} />;
}

export function NumberExtractorTool({ tool, ...shellProps }) {
  const state = textState("Budget 1200, runway 18.5 months, margin 12%.");
  const output = useMemo(() => (state.value.match(/-?\d+(?:\.\d+)?/g) || []).join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract numeric values from text." inputArea={<><ToolInput label="Text input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="Numbers will appear here." />} />;
}

export function KeywordDensityCheckerTool({ tool, ...shellProps }) {
  const state = textState("quiet tools help teams work quietly and keep quiet systems tidy");
  const items = useMemo(() => {
    const words = state.value.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    const counts = new Map();
    words.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([word, count]) => ({ label: word, value: `${count} (${((count / Math.max(1, words.length)) * 100).toFixed(1)}%)` }));
  }, [state.value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Count repeated keywords and estimate simple density by term." inputArea={<><ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function DuplicateParagraphFinderTool({ tool, ...shellProps }) {
  const state = textState("First paragraph.\n\nRepeated paragraph.\n\nRepeated paragraph.\n\nAnother paragraph.");
  const output = useMemo(() => {
    const counts = new Map();
    state.value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean).forEach((paragraph) => counts.set(paragraph, (counts.get(paragraph) || 0) + 1));
    return [...counts.entries()].filter(([, count]) => count > 1).map(([paragraph, count]) => `${paragraph}\n(count: ${count})`).join("\n\n");
  }, [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Find duplicate paragraphs in a document." inputArea={<><ToolInput label="Paragraph text"><textarea rows="14" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="Duplicate paragraphs will appear here." />} />;
}

export function LineFilterTool({ tool, ...shellProps }) {
  const state = textState("quiet tools\nfast tools\nold tools\nnew tools");
  const [term, setTerm] = useState("tools");
  const [mode, setMode] = useState("contains");
  const output = useMemo(() => state.value.split(/\r?\n/).filter((line) => mode === "contains" ? line.includes(term) : !line.includes(term)).join("\n"), [mode, state.value, term]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Keep or remove lines based on whether they contain a term." inputArea={<><div className="split-fields"><ToolInput label="Mode"><select value={mode} onChange={(e) => setMode(e.target.value)}><option value="contains">Contains</option><option value="excludes">Excludes</option></select></ToolInput><ToolInput label="Term"><input value={term} onChange={(e) => setTerm(e.target.value)} /></ToolInput></div><ToolInput label="Lines"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function BatchFindReplaceTool({ tool, ...shellProps }) {
  const state = textState("quiet tools\nfast tools\nquiet systems");
  const [pairs, setPairs] = useState("quiet=focused\ntools=workflows");
  const output = useMemo(() => pairs.split(/\r?\n/).filter(Boolean).reduce((current, line) => {
    const [find, ...rest] = line.split("=");
    const replace = rest.join("=");
    return find ? current.split(find).join(replace) : current;
  }, state.value), [pairs, state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Apply multiple find-and-replace pairs in one pass." inputArea={<><ToolInput label="Find=replace pairs"><textarea rows="6" value={pairs} onChange={(e) => setPairs(e.target.value)} /></ToolInput><ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function WrapLinesInJsonFormatterTool({ tool, ...shellProps }) {
  const state = textState("alpha\nbravo\ncharlie");
  const output = useMemo(() => JSON.stringify(state.value.split(/\r?\n/).filter(Boolean), null, 2), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Turn one item per line into a formatted JSON array." inputArea={<><ToolInput label="Lines"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function UrlGeneratorFromListTool({ tool, ...shellProps }) {
  const state = textState("quiet tools\nbrowser utilities\ncsv formatter");
  const [baseUrl, setBaseUrl] = useState("https://findtools.net/search/");
  const output = useMemo(() => state.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => `${baseUrl}${line.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`).join("\n"), [baseUrl, state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate one clean URL per line from a list of labels." inputArea={<><ToolInput label="Base URL"><input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} /></ToolInput><ToolInput label="Line list"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function TitleLengthCheckerTool({ tool, ...shellProps }) {
  const state = textState("Quiet browser-based tools for daily work");
  const count = state.value.length;
  const status = count < 30 ? "Short" : count > 60 ? "Long" : "Good";
  tool.copyValue = () => `${state.value}\nLength: ${count}\nStatus: ${status}`;
  return <ToolShell {...shellProps} tool={tool} instructions="Check title length against common SEO display ranges." inputArea={<><ToolInput label="Title"><input value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={[{ label: "Characters", value: String(count) }, { label: "Status", value: status }]} /></ResultPanel>} />;
}

export function MetaDescriptionLengthCheckerTool({ tool, ...shellProps }) {
  const state = textState("Findtools keeps practical browser-based utilities in one calm workspace with local processing and instant results.");
  const count = state.value.length;
  const status = count < 70 ? "Short" : count > 160 ? "Long" : "Good";
  tool.copyValue = () => `${state.value}\nLength: ${count}\nStatus: ${status}`;
  return <ToolShell {...shellProps} tool={tool} instructions="Check meta description length for common search snippet ranges." inputArea={<><ToolInput label="Meta description"><textarea rows="5" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={[{ label: "Characters", value: String(count) }, { label: "Status", value: status }]} /></ResultPanel>} />;
}

export function MetaTagPreviewerTool({ tool, ...shellProps }) {
  const [title, setTitle] = useState("JSON Formatter - Findtools");
  const [description, setDescription] = useState("Format JSON locally in the browser with instant output and no upload.");
  const [url, setUrl] = useState("https://findtools.net/tools/json-formatter");
  const output = useMemo(() => `<title>${title}</title>\n<meta name="description" content="${description}" />\n<link rel="canonical" href="${url}" />`, [description, title, url]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Preview common page-level SEO tags and the generated HTML." inputArea={<><ToolInput label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} /></ToolInput><ToolInput label="Description"><textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} /></ToolInput><ToolInput label="Canonical URL"><input value={url} onChange={(e) => setUrl(e.target.value)} /></ToolInput><ActionRow><button className="button button--secondary" onClick={() => { setTitle("JSON Formatter - Findtools"); setDescription("Format JSON locally in the browser with instant output and no upload."); setUrl("https://findtools.net/tools/json-formatter"); }} type="button">Reset</button></ActionRow></>} outputArea={<div className="stack-sm"><ResultPanel title="Search preview">{<div className="stack-sm"><strong>{title}</strong><span>{url}</span><p>{description}</p></div>}</ResultPanel><ResultPanel value={output} /></div>} />;
}

export function OpenGraphPreviewerTool({ tool, ...shellProps }) {
  const [title, setTitle] = useState("Findtools utility workspace");
  const [description, setDescription] = useState("Browser-based tools that keep text, files, and quick calculations moving without uploads.");
  const [url, setUrl] = useState("https://findtools.net");
  const [siteName, setSiteName] = useState("Findtools");
  const [imageUrl, setImageUrl] = useState("https://findtools.net/assets/og-default.png");
  const output = useMemo(() => [
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:site_name" content="${siteName}" />`,
    `<meta property="og:image" content="${imageUrl}" />`
  ].join("\n"), [description, imageUrl, siteName, title, url]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Preview Open Graph tags and a simple social card layout." inputArea={<><ToolInput label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} /></ToolInput><ToolInput label="Description"><textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} /></ToolInput><div className="split-fields"><ToolInput label="URL"><input value={url} onChange={(e) => setUrl(e.target.value)} /></ToolInput><ToolInput label="Site name"><input value={siteName} onChange={(e) => setSiteName(e.target.value)} /></ToolInput></div><ToolInput label="Image URL"><input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /></ToolInput></>} outputArea={<div className="stack-sm"><ResultPanel title="Social preview">{<div className="stack-sm"><strong>{title}</strong><span>{siteName}</span><span>{url}</span><p>{description}</p></div>}</ResultPanel><ResultPanel value={output} /></div>} />;
}

export function RobotsTxtGeneratorTool({ tool, ...shellProps }) {
  const [userAgent, setUserAgent] = useState("*");
  const [disallow, setDisallow] = useState("/private\n/tmp");
  const [allow, setAllow] = useState("/");
  const [sitemap, setSitemap] = useState("https://findtools.net/sitemap.xml");
  const output = useMemo(() => {
    const allowLines = allow.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => `Allow: ${line}`);
    const disallowLines = disallow.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => `Disallow: ${line}`);
    return [`User-agent: ${userAgent}`, ...allowLines, ...disallowLines, `Sitemap: ${sitemap}`].join("\n");
  }, [allow, disallow, sitemap, userAgent]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate a simple robots.txt file from common directives." inputArea={<><ToolInput label="User-agent"><input value={userAgent} onChange={(e) => setUserAgent(e.target.value)} /></ToolInput><ToolInput label="Allow rules"><textarea rows="4" value={allow} onChange={(e) => setAllow(e.target.value)} /></ToolInput><ToolInput label="Disallow rules"><textarea rows="4" value={disallow} onChange={(e) => setDisallow(e.target.value)} /></ToolInput><ToolInput label="Sitemap URL"><input value={sitemap} onChange={(e) => setSitemap(e.target.value)} /></ToolInput></>} outputArea={<ResultPanel value={output} />} />;
}

export function SitemapCheckerTool({ tool, ...shellProps }) {
  const state = textState(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://findtools.net/</loc></url>\n  <url><loc>https://findtools.net/tools/json-formatter</loc></url>\n</urlset>`);
  const result = useMemo(() => {
    const doc = new DOMParser().parseFromString(state.value, "application/xml");
    if (doc.querySelector("parsererror")) return { ok: false, items: [], text: "Invalid XML sitemap." };
    const locs = [...doc.getElementsByTagName("loc")].map((node) => node.textContent?.trim() || "").filter(Boolean);
    const duplicates = locs.length - new Set(locs).size;
    const invalid = locs.filter((loc) => !/^https?:\/\//.test(loc)).length;
    return { ok: true, text: "Sitemap parsed successfully.", items: [{ label: "URLs", value: String(locs.length) }, { label: "Duplicate URLs", value: String(duplicates) }, { label: "Invalid loc values", value: String(invalid) }] };
  }, [state.value]);
  tool.copyValue = () => [result.text, ...result.items.map((item) => `${item.label}: ${item.value}`)].join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Validate sitemap XML structure and count basic URL issues." validation={<InlineMessage tone={result.ok ? "success" : "error"}>{result.text}</InlineMessage>} inputArea={<><ToolInput label="Sitemap XML"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={result.items} /></ResultPanel>} />;
}

export function SchemaMarkupFormatterTool({ tool, ...shellProps }) {
  const state = textState('{"@context":"https://schema.org","@type":"WebSite","name":"Findtools","url":"https://findtools.net"}');
  const parsed = useMemo(() => {
    try {
      return { ok: true, text: JSON.stringify(JSON.parse(state.value), null, 2) };
    } catch (error) {
      return { ok: false, text: "", error: error.message };
    }
  }, [state.value]);
  tool.copyValue = () => parsed.text;
  return <ToolShell {...shellProps} tool={tool} instructions="Format JSON-LD schema markup and validate that it parses cleanly." validation={!parsed.ok ? <InlineMessage tone="error">{parsed.error}</InlineMessage> : null} inputArea={<><ToolInput label="Schema markup"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={parsed.text} placeholder="Formatted schema JSON will appear here." />} />;
}

export function LineLengthCheckerTool({ tool, ...shellProps }) {
  const state = textState("quiet tools\nbrowser utilities\nformat csv online");
  const items = useMemo(() => state.value.split(/\r?\n/).map((line, index) => ({ label: `Line ${index + 1}`, value: `${line.length} chars` })), [state.value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Count the character length of each line in a block of text." inputArea={<><ToolInput label="Text input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function AlphabeticalUniqueSorterTool({ tool, ...shellProps }) {
  const state = textState("beta\nalpha\nbeta\ncharlie");
  const output = useMemo(() => [...new Set(state.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Deduplicate a line list and sort the result alphabetically." inputArea={<><ToolInput label="Line list"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function EmailListCleanerTool({ tool, ...shellProps }) {
  const state = textState(" Ava@example.com \nava@example.com\nBEN@example.com\nnot-an-email");
  const output = useMemo(() => [...new Set((state.value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((email) => email.toLowerCase()))].join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract, normalize, deduplicate, and clean an email list." inputArea={<><ToolInput label="Mixed email text"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="Clean email list will appear here." />} />;
}

export function CsvHeaderExtractorTool({ tool, ...shellProps }) {
  const state = textState("name,email,team\nAva,ava@example.com,Product");
  const output = useMemo(() => {
    const [header = []] = parseCsv(state.value);
    return header.join("\n");
  }, [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract only the header row from CSV input." inputArea={<><ToolInput label="CSV input"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function WordListToJsonArrayTool({ tool, ...shellProps }) {
  const state = textState("alpha\nbravo\ncharlie");
  const output = useMemo(() => JSON.stringify(state.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean), null, 2), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Turn one word or phrase per line into a formatted JSON array." inputArea={<><ToolInput label="Line list"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function TextPrefixRemoverTool({ tool, ...shellProps }) {
  const state = textState("ID-100\nID-200\nID-300");
  const [prefix, setPrefix] = useState("ID-");
  const output = useMemo(() => state.value.split(/\r?\n/).map((line) => line.startsWith(prefix) ? line.slice(prefix.length) : line).join("\n"), [prefix, state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove the same prefix from each line when present." inputArea={<><ToolInput label="Prefix"><input value={prefix} onChange={(e) => setPrefix(e.target.value)} /></ToolInput><ToolInput label="Line list"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function TextSuffixRemoverTool({ tool, ...shellProps }) {
  const state = textState("report.pdf\nnotes.pdf\ndraft.pdf");
  const [suffix, setSuffix] = useState(".pdf");
  const output = useMemo(() => state.value.split(/\r?\n/).map((line) => line.endsWith(suffix) ? line.slice(0, -suffix.length) : line).join("\n"), [state.value, suffix]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove the same suffix from each line when present." inputArea={<><ToolInput label="Suffix"><input value={suffix} onChange={(e) => setSuffix(e.target.value)} /></ToolInput><ToolInput label="Line list"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function SentenceCaseConverterTool({ tool, ...shellProps }) {
  const state = textState("hello world. THIS IS LOUD! new sentence?");
  const output = useMemo(() => sentenceCase(state.value), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Convert text into sentence case." inputArea={<><ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function RemovePunctuationTool({ tool, ...shellProps }) {
  const state = textState("Hello, tools! Keep-it clean: please.");
  const output = useMemo(() => removePunctuation(state.value), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove punctuation characters while keeping letters and numbers." inputArea={<><ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function EmailDomainExtractorTool({ tool, ...shellProps }) {
  const state = textState("ava@findtools.net\nben@example.com\nops@findtools.net");
  const output = useMemo(() => extractEmailDomains(state.value).join("\n"), [state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Extract unique email domains from mixed text." inputArea={<><ToolInput label="Text input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} placeholder="Domains will appear here." />} />;
}

export function CsvRowCounterTool({ tool, ...shellProps }) {
  const state = textState("name,email,team\nAva,ava@example.com,Product\nBen,ben@example.com,Engineering");
  const items = useMemo(() => {
    const rows = parseCsv(state.value);
    return [
      { label: "Total rows", value: String(rows.length) },
      { label: "Data rows", value: String(Math.max(0, rows.length - 1)) },
      { label: "Header columns", value: String(rows[0]?.length || 0) }
    ];
  }, [state.value]);
  tool.copyValue = () => items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Count total CSV rows and data rows." inputArea={<><ToolInput label="CSV input"><textarea rows="12" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel><KeyValueList items={items} /></ResultPanel>} />;
}

export function LinePrefixRemoverTool({ tool, ...shellProps }) {
  const state = textState("TODO: first\nTODO: second\nTODO: third");
  const [prefix, setPrefix] = useState("TODO: ");
  const output = useMemo(() => state.value.split(/\r?\n/).map((line) => line.startsWith(prefix) ? line.slice(prefix.length) : line).join("\n"), [prefix, state.value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove a matching prefix from each line." inputArea={<><ToolInput label="Prefix"><input value={prefix} onChange={(e) => setPrefix(e.target.value)} /></ToolInput><ToolInput label="Line list"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}

export function LineSuffixRemoverTool({ tool, ...shellProps }) {
  const state = textState("report-final\nsummary-final\nnotes-final");
  const [suffix, setSuffix] = useState("-final");
  const output = useMemo(() => state.value.split(/\r?\n/).map((line) => line.endsWith(suffix) ? line.slice(0, -suffix.length) : line).join("\n"), [state.value, suffix]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove a matching suffix from each line." inputArea={<><ToolInput label="Suffix"><input value={suffix} onChange={(e) => setSuffix(e.target.value)} /></ToolInput><ToolInput label="Line list"><textarea rows="10" value={state.value} onChange={(e) => state.setValue(e.target.value)} /></ToolInput>{baseActions({ clear: state.clear, reset: state.reset })}</>} outputArea={<ResultPanel value={output} />} />;
}
