import { useMemo, useState } from "react";
import { ActionRow, ResultPanel, ToolInput } from "../components/common";
import { ToolShell } from "../components/ToolShell";

function simpleTool(tool, shellProps, instructions, value, setValue, output, sample) {
  tool.copyValue = () => output;
  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions={instructions}
      inputArea={
        <>
          <ToolInput label="Text input"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>
          <ActionRow>
            {sample ? <button className="button button--secondary" onClick={sample} type="button">Sample</button> : null}
            <button className="button button--secondary" onClick={() => setValue("")} type="button">Clear</button>
          </ActionRow>
        </>
      }
      outputArea={<ResultPanel value={output} />}
    />
  );
}

export function CommaSeparatedListBuilderTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha\nbravo\ncharlie");
  return simpleTool(tool, shellProps, "Turn one item per line into a comma-separated list.", value, setValue, value.split(/\r?\n/).filter(Boolean).join(", "));
}

export function ListToBulletPointsTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha, bravo, charlie");
  return simpleTool(tool, shellProps, "Convert a comma-separated list into bullet points.", value, setValue, value.split(",").map((item) => `- ${item.trim()}`).filter((item) => item !== "- ").join("\n"));
}

export function BulletPointsToListTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("- alpha\n- bravo\n- charlie");
  return simpleTool(tool, shellProps, "Convert bullet points into a single comma-separated line.", value, setValue, value.split(/\r?\n/).map((line) => line.replace(/^\s*[-*]\s*/, "").trim()).filter(Boolean).join(", "));
}

export function TextColumnSplitterTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("name | role | team");
  const output = useMemo(() => value.split("|").map((part) => part.trim()).join("\n"), [value]);
  return simpleTool(tool, shellProps, "Split a delimiter-separated line into one value per line.", value, setValue, output);
}

export function MergeLinesIntoSingleLineTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("quiet\nsteady\nuseful");
  const output = useMemo(() => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join(" "), [value]);
  return simpleTool(tool, shellProps, "Merge multiple lines into a single line.", value, setValue, output);
}

export function CharacterLimitTrimmerTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("This line is slightly too long for a small field.");
  const [limit, setLimit] = useState("32");
  const output = useMemo(() => value.slice(0, Number(limit) || 0), [limit, value]);
  tool.copyValue = () => output;
  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Trim text to a target character limit."
      inputArea={
        <>
          <ToolInput label="Character limit"><input value={limit} onChange={(e) => setLimit(e.target.value)} /></ToolInput>
          <ToolInput label="Text input"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>
          <ActionRow><button className="button button--secondary" onClick={() => { setValue(""); setLimit("32"); }} type="button">Reset</button></ActionRow>
        </>
      }
      outputArea={<ResultPanel value={output} />}
    />
  );
}

export function PrefixLinesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha\nbravo\ncharlie");
  const [prefix, setPrefix] = useState("- ");
  const output = useMemo(() => value.split(/\r?\n/).map((line) => `${prefix}${line}`).join("\n"), [prefix, value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Add a prefix to every line." inputArea={<><ToolInput label="Prefix"><input value={prefix} onChange={(e) => setPrefix(e.target.value)} /></ToolInput><ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput></>} outputArea={<ResultPanel value={output} />} />;
}

export function SuffixLinesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha\nbravo\ncharlie");
  const [suffix, setSuffix] = useState(";");
  const output = useMemo(() => value.split(/\r?\n/).map((line) => `${line}${suffix}`).join("\n"), [suffix, value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Add a suffix to every line." inputArea={<><ToolInput label="Suffix"><input value={suffix} onChange={(e) => setSuffix(e.target.value)} /></ToolInput><ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput></>} outputArea={<ResultPanel value={output} />} />;
}

export function JoinWithDelimiterTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha\nbravo\ncharlie");
  const [delimiter, setDelimiter] = useState(" | ");
  const output = useMemo(() => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join(delimiter), [delimiter, value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Join lines using a custom delimiter." inputArea={<><ToolInput label="Delimiter"><input value={delimiter} onChange={(e) => setDelimiter(e.target.value)} /></ToolInput><ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput></>} outputArea={<ResultPanel value={output} />} />;
}

export function WrapLinesInQuotesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha\nbravo\ncharlie");
  const output = useMemo(() => value.split(/\r?\n/).filter(Boolean).map((line) => `"${line}"`).join("\n"), [value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Wrap each line in double quotes." inputArea={<ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output} />} />;
}

export function RemoveCommonIndentTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("    first line\n    second line\n      third line");
  const output = useMemo(() => {
    const lines = value.split(/\r?\n/);
    const indents = lines.filter((line) => line.trim()).map((line) => (line.match(/^ */) || [""])[0].length);
    const common = indents.length ? Math.min(...indents) : 0;
    return lines.map((line) => line.slice(common)).join("\n");
  }, [value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove the shared leading indentation from all non-empty lines." inputArea={<ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output} />} />;
}

export function DuplicateLinesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha\nbravo\ncharlie");
  const output = useMemo(() => value.split(/\r?\n/).flatMap((line) => [line, line]).join("\n"), [value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Duplicate each line once while preserving order." inputArea={<ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output} />} />;
}

export function SurroundTextTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha\nbravo\ncharlie");
  const [left, setLeft] = useState("[");
  const [right, setRight] = useState("]");
  const output = useMemo(() => value.split(/\r?\n/).filter(Boolean).map((line) => `${left}${line}${right}`).join("\n"), [left, right, value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Wrap each non-empty line with a prefix and suffix." inputArea={<><div className="split-fields"><ToolInput label="Prefix"><input value={left} onChange={(e) => setLeft(e.target.value)} /></ToolInput><ToolInput label="Suffix"><input value={right} onChange={(e) => setRight(e.target.value)} /></ToolInput></div><ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput></>} outputArea={<ResultPanel value={output} />} />;
}

export function RemoveLineBreaksTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("quiet\nsteady\nuseful");
  const output = useMemo(() => value.replace(/\r?\n+/g, " ").trim(), [value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove line breaks and collapse the text into one line." inputArea={<ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output} />} />;
}

export function TrimLinesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("  alpha  \n bravo \ncharlie   ");
  const output = useMemo(() => value.split(/\r?\n/).map((line) => line.trim()).join("\n"), [value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Trim leading and trailing whitespace from every line." inputArea={<ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output} />} />;
}

export function SortLinesByLengthTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("longer line\nmid\nshort");
  const [direction, setDirection] = useState("asc");
  const output = useMemo(() => value.split(/\r?\n/).filter(Boolean).sort((a, b) => direction === "asc" ? a.length - b.length || a.localeCompare(b) : b.length - a.length || a.localeCompare(b)).join("\n"), [direction, value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Sort lines by character length in ascending or descending order." inputArea={<><ToolInput label="Direction"><select value={direction} onChange={(e) => setDirection(e.target.value)}><option value="asc">Shortest first</option><option value="desc">Longest first</option></select></ToolInput><ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput></>} outputArea={<ResultPanel value={output} />} />;
}

export function NumberLinesWithoutBlankLinesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha\n\nbravo\ncharlie\n");
  const output = useMemo(() => {
    let count = 0;
    return value.split(/\r?\n/).map((line) => {
      if (!line.trim()) return line;
      count += 1;
      return `${count}. ${line}`;
    }).join("\n");
  }, [value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Add numbers to non-empty lines while leaving blank lines untouched." inputArea={<ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output} />} />;
}

export function IndentLinesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha\nbravo\ncharlie");
  const [spaces, setSpaces] = useState("2");
  const output = useMemo(() => value.split(/\r?\n/).map((line) => `${" ".repeat(Math.max(0, Number(spaces) || 0))}${line}`).join("\n"), [spaces, value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Add the same left indentation to every line." inputArea={<><ToolInput label="Spaces"><input value={spaces} onChange={(e) => setSpaces(e.target.value)} /></ToolInput><ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput></>} outputArea={<ResultPanel value={output} />} />;
}

export function UnindentLinesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("    alpha\n    bravo\n      charlie");
  const [spaces, setSpaces] = useState("2");
  const output = useMemo(() => {
    const count = Math.max(0, Number(spaces) || 0);
    return value.split(/\r?\n/).map((line) => line.replace(new RegExp(`^ {0,${count}}`), "")).join("\n");
  }, [spaces, value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove a chosen amount of leading spaces from each line." inputArea={<><ToolInput label="Spaces to remove"><input value={spaces} onChange={(e) => setSpaces(e.target.value)} /></ToolInput><ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput></>} outputArea={<ResultPanel value={output} />} />;
}

export function RemoveSurroundingQuotesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState('"alpha"\n"bravo"\n"charlie"');
  const output = useMemo(() => value.split(/\r?\n/).map((line) => line.replace(/^['"]|['"]$/g, "")).join("\n"), [value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove one layer of wrapping single or double quotes from each line." inputArea={<ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output} />} />;
}

export function CondenseBlankLinesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha\n\n\nbravo\n\n\n\ncharlie");
  const output = useMemo(() => value.replace(/\n{3,}/g, "\n\n"), [value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Reduce large blank gaps down to single blank lines." inputArea={<ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output} />} />;
}

export function LeftTrimLinesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("  alpha\n bravo\n    charlie");
  const output = useMemo(() => value.split(/\r?\n/).map((line) => line.replace(/^\s+/, "")).join("\n"), [value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove leading whitespace from each line only." inputArea={<ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output} />} />;
}

export function RightTrimLinesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("alpha  \nbravo \ncharlie   ");
  const output = useMemo(() => value.split(/\r?\n/).map((line) => line.replace(/\s+$/, "")).join("\n"), [value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Remove trailing whitespace from each line only." inputArea={<ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output} />} />;
}
