import { useMemo, useState } from "react";
import bcrypt from "bcryptjs";
import exifr from "exifr";
import { PDFDocument } from "pdf-lib";
import * as XLSX from "xlsx";
import { ActionRow, InlineMessage, KeyValueList, ResultPanel, ToolInput } from "../components/common";
import { ToolShell } from "../components/ToolShell";
import { binaryFromText, businessDaysInYear, determinant2x2, isoWeekNumber, parseMatrix, percentageChange, reversePercentage, textFromBinary, transferTimeSeconds, basicStats } from "../lib/toolLogic/longTail";
import { bytesToSize, downloadBlob } from "../lib/utils";

function currency(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value || 0);
}

function number(value, digits = 2) {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value || 0);
}

function percent(value, digits = 2) {
  return `${number(value, digits)}%`;
}

function CalculatorFrame({ tool, shellProps, instructions, inputArea, items, main }) {
  tool.copyValue = () => [main, ...items.map((item) => `${item.label}: ${item.value}`)].join("\n");
  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions={instructions}
      inputArea={inputArea}
      outputArea={<ResultPanel title="Result"><div className="stack-sm"><pre>{main}</pre><KeyValueList items={items} /></div></ResultPanel>}
    />
  );
}

export function FinanceSeoTool({ tool, ...shellProps }) {
  const slug = tool.slug;
  const [a, setA] = useState("100");
  const [b, setB] = useState("120");
  const [c, setC] = useState("20");
  const [d, setD] = useState("5");

  const result = useMemo(() => {
    const n1 = Number(a) || 0;
    const n2 = Number(b) || 0;
    const n3 = Number(c) || 0;
    const n4 = Number(d) || 0;

    if (slug === "percentage-increase-calculator" || slug === "percentage-decrease-calculator" || slug === "percentage-difference-calculator" || slug === "percentage-change-between-two-numbers-calculator") {
      const change = percentageChange(n1, n2);
      const difference = n1 === 0 && n2 === 0 ? 0 : (Math.abs(n2 - n1) / ((Math.abs(n1) + Math.abs(n2)) / 2 || 1)) * 100;
      const value = slug === "percentage-difference-calculator" ? difference : change;
      return {
        instructions: "Compare two numbers and calculate percentage movement.",
        main: `Result: ${percent(value)}`,
        items: [
          { label: "Start", value: number(n1) },
          { label: "End", value: number(n2) },
          { label: "Change", value: percent(change) }
        ]
      };
    }

    if (slug === "reverse-percentage-increase-calculator" || slug === "reverse-percentage-decrease-calculator") {
      const original = reversePercentage(n1, n2, slug.includes("decrease") ? "decrease" : "increase");
      return {
        instructions: "Work backward from a final amount and a percentage change.",
        main: `Original value: ${number(original)}`,
        items: [
          { label: "Final value", value: number(n1) },
          { label: "Rate", value: percent(n2) },
          { label: "Original", value: number(original) }
        ]
      };
    }

    if (slug === "percentage-of-a-number-calculator") {
      const output = (n1 * n2) / 100;
      return { instructions: "Calculate a percentage of a number.", main: `${number(n2)}% of ${number(n1)} = ${number(output)}`, items: [{ label: "Value", value: number(n1) }, { label: "Percent", value: percent(n2) }, { label: "Result", value: number(output) }] };
    }

    if (slug === "percentage-off-calculator" || slug === "discount-calculator-with-tax") {
      const discounted = n1 * (1 - n2 / 100);
      const taxed = discounted * (1 + n3 / 100);
      return { instructions: "Apply a discount and optionally add tax.", main: `Final price: ${currency(slug === "discount-calculator-with-tax" ? taxed : discounted)}`, items: [{ label: "Original price", value: currency(n1) }, { label: "Discount", value: percent(n2) }, { label: "Tax", value: percent(n3) }, { label: "After discount", value: currency(discounted) }] };
    }

    if (slug === "sales-tax-reverse-calculator") {
      const preTax = n1 / (1 + n2 / 100);
      return { instructions: "Back out sales tax from a tax-inclusive total.", main: `Pre-tax amount: ${currency(preTax)}`, items: [{ label: "Final total", value: currency(n1) }, { label: "Tax rate", value: percent(n2) }, { label: "Sales tax", value: currency(n1 - preTax) }] };
    }

    if (slug === "sales-tax-calculator-by-state") {
      const rates = { CA: 7.25, CO: 2.9, FL: 6, NY: 4, TX: 6.25, WA: 6.5 };
      const stateRate = rates[String(b).toUpperCase()] ?? 0;
      const total = n1 * (1 + stateRate / 100);
      return { instructions: "Estimate sales tax using a simple state-level rate.", main: `Total with tax: ${currency(total)}`, items: [{ label: "State", value: String(b).toUpperCase() }, { label: "Rate", value: percent(stateRate) }, { label: "Sales tax", value: currency(total - n1) }] };
    }

    if (slug === "compound-interest-calculator-daily" || slug === "compound-interest-calculator-monthly") {
      const compounds = slug.includes("daily") ? 365 : 12;
      const total = n1 * (1 + n2 / 100 / compounds) ** (compounds * n3);
      return { instructions: "Project compound growth using a fixed daily or monthly cadence.", main: `Future value: ${currency(total)}`, items: [{ label: "Principal", value: currency(n1) }, { label: "Rate", value: percent(n2) }, { label: "Compounds per year", value: String(compounds) }, { label: "Years", value: String(n3) }] };
    }

    if (slug === "annual-percentage-yield-calculator") {
      const apy = (1 + n1 / 100 / Math.max(1, n2)) ** Math.max(1, n2) - 1;
      return { instructions: "Convert APR and compounding frequency into APY.", main: `APY: ${percent(apy * 100)}`, items: [{ label: "APR", value: percent(n1) }, { label: "Compounds per year", value: String(Math.max(1, n2)) }, { label: "APY", value: percent(apy * 100) }] };
    }

    if (slug === "net-present-value-calculator") {
      const cashflows = String(b).split(",").map((value) => Number(value.trim()) || 0);
      const npv = cashflows.reduce((sum, value, index) => sum + value / (1 + n1 / 100) ** (index + 1), 0) - n2;
      return { instructions: "Discount future cash flows back to the present.", main: `NPV: ${currency(npv)}`, items: [{ label: "Initial investment", value: currency(n2) }, { label: "Discount rate", value: percent(n1) }, { label: "Cash flows", value: cashflows.join(", ") }] };
    }

    if (slug === "internal-rate-of-return-calculator") {
      const flows = String(a).split(",").map((value) => Number(value.trim()) || 0);
      let rate = 0.1;
      for (let i = 0; i < 40; i += 1) {
        const npv = flows.reduce((sum, value, index) => sum + value / (1 + rate) ** index, 0);
        const derivative = flows.reduce((sum, value, index) => (index === 0 ? sum : sum - (index * value) / (1 + rate) ** (index + 1)), 0);
        rate -= npv / (derivative || 1);
      }
      return { instructions: "Estimate IRR from a stream of cash flows.", main: `Estimated IRR: ${percent(rate * 100)}`, items: [{ label: "Cash flows", value: flows.join(", ") }, { label: "Iterations", value: "Newton approximation" }, { label: "IRR", value: percent(rate * 100) }] };
    }

    if (slug === "credit-card-minimum-payment-calculator") {
      const minPayment = Math.max(25, n1 * 0.02 + (n1 * n2) / 100 / 12);
      return { instructions: "Estimate a common minimum credit card payment.", main: `Estimated minimum payment: ${currency(minPayment)}`, items: [{ label: "Balance", value: currency(n1) }, { label: "APR", value: percent(n2) }, { label: "Formula", value: "2% + monthly interest or $25" }] };
    }

    return { instructions: "Solve a focused finance or percentage calculation.", main: `Monthly payment: ${currency((n1 * ((n2 / 100 / 12) * (1 + n2 / 100 / 12) ** Math.max(1, n3))) / (((1 + n2 / 100 / 12) ** Math.max(1, n3)) - 1 || 1))}`, items: [{ label: "Amount", value: currency(n1) }, { label: "Rate", value: percent(n2) }, { label: "Months", value: String(Math.max(1, n3)) }] };
  }, [a, b, c, d, slug]);

  const inputArea = slug === "sales-tax-calculator-by-state"
    ? <><ToolInput label="Amount"><input value={a} onChange={(e) => setA(e.target.value)} /></ToolInput><ToolInput label="State code"><input value={b} onChange={(e) => setB(e.target.value)} /></ToolInput></>
    : slug === "internal-rate-of-return-calculator"
      ? <ToolInput label="Cash flows"><textarea rows="8" value={a} onChange={(e) => setA(e.target.value)} /></ToolInput>
      : slug === "net-present-value-calculator"
        ? <><ToolInput label="Discount rate %"><input value={a} onChange={(e) => setA(e.target.value)} /></ToolInput><ToolInput label="Initial investment"><input value={b} onChange={(e) => setB(e.target.value)} /></ToolInput><ToolInput label="Cash flows (comma separated)"><textarea rows="8" value={c} onChange={(e) => setC(e.target.value)} /></ToolInput></>
        : <><div className="split-fields"><ToolInput label="Value A"><input value={a} onChange={(e) => setA(e.target.value)} /></ToolInput><ToolInput label="Value B / Rate"><input value={b} onChange={(e) => setB(e.target.value)} /></ToolInput></div><div className="split-fields"><ToolInput label="Value C / Years"><input value={c} onChange={(e) => setC(e.target.value)} /></ToolInput>{slug === "discount-calculator-with-tax" ? <ToolInput label="Extra value"><input value={d} onChange={(e) => setD(e.target.value)} /></ToolInput> : null}</div></>;

  return <CalculatorFrame tool={tool} shellProps={shellProps} instructions={result.instructions} inputArea={inputArea} main={result.main} items={result.items} />;
}

export function DateSeoTool({ tool, ...shellProps }) {
  const slug = tool.slug;
  const [dateA, setDateA] = useState("2026-01-15");
  const [dateB, setDateB] = useState("2026-02-15");
  const [amount, setAmount] = useState("30");
  const items = useMemo(() => {
    const start = new Date(dateA);
    const end = new Date(dateB);
    const diffDays = Math.round((end - start) / 86400000);
    if (slug === "add-days-to-date-calculator" || slug === "subtract-days-from-date-calculator") {
      const next = new Date(start);
      next.setDate(next.getDate() + (slug.includes("subtract") ? -Number(amount || 0) : Number(amount || 0)));
      return { main: next.toDateString(), items: [{ label: "Start", value: start.toDateString() }, { label: "Days", value: amount }] };
    }
    if (slug === "day-of-week-calculator" || slug === "leap-year-checker" || slug === "calendar-week-number-calculator" || slug === "working-days-in-a-year-calculator") {
      const year = start.getFullYear();
      return {
        main: slug === "day-of-week-calculator" ? start.toLocaleDateString(undefined, { weekday: "long" }) : slug === "leap-year-checker" ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? "Leap year" : "Not a leap year") : slug === "calendar-week-number-calculator" ? `Week ${isoWeekNumber(dateA)}` : `${businessDaysInYear(year)} working days`,
        items: [{ label: "Date", value: start.toDateString() }, { label: "Year", value: String(year) }]
      };
    }
    if (slug === "time-until-next-birthday-calculator") {
      const today = new Date();
      const next = new Date(today.getFullYear(), start.getMonth(), start.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      const days = Math.ceil((next - today) / 86400000);
      return { main: `${days} days`, items: [{ label: "Birthday", value: next.toDateString() }] };
    }
    if (slug === "hours-between-timestamps-calculator" || slug === "minutes-between-timestamps-calculator") {
      const diffMinutes = Math.round((end - start) / 60000);
      return { main: slug.includes("hours") ? `${number(diffMinutes / 60)} hours` : `${diffMinutes} minutes`, items: [{ label: "Start", value: start.toString() }, { label: "End", value: end.toString() }] };
    }
    if (slug === "working-hours-per-month-calculator") {
      const hours = Number(amount || 0) * 5 * 4.33;
      return { main: `${number(hours)} hours`, items: [{ label: "Hours per day", value: amount }, { label: "Assumption", value: "5 days/week" }] };
    }
    return { main: `${diffDays} days`, items: [{ label: "Start", value: start.toDateString() }, { label: "End", value: end.toDateString() }, { label: "Difference", value: `${diffDays} days` }] };
  }, [amount, dateA, dateB, slug]);

  return <CalculatorFrame tool={tool} shellProps={shellProps} instructions="Handle focused date, calendar, and timestamp questions." inputArea={<><div className="split-fields"><ToolInput label="Date A"><input type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} /></ToolInput><ToolInput label="Date B"><input type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} /></ToolInput></div><ToolInput label="Amount / hours"><input value={amount} onChange={(e) => setAmount(e.target.value)} /></ToolInput></>} main={items.main} items={items.items} />;
}

export function ConversionSeoTool({ tool, ...shellProps }) {
  const slug = tool.slug;
  const [a, setA] = useState("100");
  const [b, setB] = useState("96");
  const result = useMemo(() => {
    const n1 = Number(a) || 0;
    const n2 = Number(b) || 0;
    if (slug === "steps-to-miles-converter") return { main: `${number(n1 / 2000)} miles`, items: [{ label: "Steps", value: String(n1) }] };
    if (slug === "steps-to-calories-calculator") return { main: `${number(n1 * 0.04)} calories`, items: [{ label: "Steps", value: String(n1) }] };
    if (slug === "miles-to-steps-converter") return { main: `${number(n1 * 2000, 0)} steps`, items: [{ label: "Miles", value: number(n1) }] };
    if (slug === "minutes-per-mile-to-kmh-converter") return { main: `${number(60 / (n1 * 1.609344))} km/h`, items: [{ label: "Minutes per mile", value: number(n1) }] };
    if (slug === "minutes-per-km-to-mph-converter") return { main: `${number(60 / n1 / 1.609344)} mph`, items: [{ label: "Minutes per km", value: number(n1) }] };
    if (slug === "dpi-to-pixels-calculator") return { main: `${number(n1 * n2, 0)} pixels`, items: [{ label: "Inches", value: number(n1) }, { label: "DPI", value: number(n2, 0) }] };
    if (slug === "pixels-to-inches-calculator") return { main: `${number(n1 / Math.max(1, n2))} inches`, items: [{ label: "Pixels", value: number(n1, 0) }, { label: "DPI", value: number(n2, 0) }] };
    if (slug === "pixels-to-rem-converter") return { main: `${number(n1 / Math.max(1, n2))} rem`, items: [{ label: "Pixels", value: number(n1, 0) }, { label: "Base size", value: `${number(n2, 0)} px` }] };
    if (slug === "rem-to-pixels-converter") return { main: `${number(n1 * n2, 0)} px`, items: [{ label: "Rem", value: number(n1) }, { label: "Base size", value: `${number(n2, 0)} px` }] };
    if (slug === "mbps-to-download-time-calculator" || slug === "download-time-calculator-file-size-speed" || slug === "upload-time-calculator") {
      const seconds = transferTimeSeconds(n1, n2);
      return { main: `${number(seconds)} seconds`, items: [{ label: "File size (MB)", value: number(n1) }, { label: "Speed (Mbps)", value: number(n2) }] };
    }
    if (slug === "screen-size-calculator-dimensions") {
      const width = Number(a) || 16;
      const height = Number(b) || 9;
      const diagonal = Math.sqrt(width ** 2 + height ** 2);
      return { main: `${number(diagonal)} diagonal units`, items: [{ label: "Width", value: number(width) }, { label: "Height", value: number(height) }] };
    }
    if (slug === "aspect-ratio-from-resolution-calculator" || slug === "resolution-scaler-calculator") {
      const gcd = (x, y) => y ? gcd(y, x % y) : x;
      const divisor = gcd(n1, n2) || 1;
      return { main: slug.includes("aspect") ? `${n1 / divisor}:${n2 / divisor}` : `${number(n1 * 1.5, 0)} × ${number(n2 * 1.5, 0)}`, items: [{ label: "Width", value: number(n1, 0) }, { label: "Height", value: number(n2, 0) }] };
    }
    const bitrate = (n1 * 8) / Math.max(1, n2);
    return { main: `${number(bitrate)} Mbps`, items: [{ label: "File size (MB)", value: number(n1) }, { label: "Duration (s)", value: number(n2) }] };
  }, [a, b, slug]);

  return <CalculatorFrame tool={tool} shellProps={shellProps} instructions="Convert niche unit, pixel, transfer, or resolution values." inputArea={<><div className="split-fields"><ToolInput label="Value A"><input value={a} onChange={(e) => setA(e.target.value)} /></ToolInput><ToolInput label="Value B"><input value={b} onChange={(e) => setB(e.target.value)} /></ToolInput></div></>} main={result.main} items={result.items} />;
}

export function DevSeoTool({ tool, ...shellProps }) {
  const slug = tool.slug;
  const [value, setValue] = useState('{"name":"Ava","active":true}');
  const [extra, setExtra] = useState("ExampleType");
  const [output, setOutput] = useState("");

  const computed = useMemo(() => {
    try {
      if (slug === "json-to-typescript-interface-generator") {
        const parsed = JSON.parse(value);
        const body = Object.entries(parsed).map(([key, val]) => `  ${key}: ${Array.isArray(val) ? "unknown[]" : typeof val === "number" ? "number" : typeof val === "boolean" ? "boolean" : typeof val === "object" ? "Record<string, unknown>" : "string"};`).join("\n");
        return `interface ${extra || "GeneratedType"} {\n${body}\n}`;
      }
      if (slug === "typescript-to-json-schema-converter") {
        const fields = value.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.includes(":"));
        const properties = Object.fromEntries(fields.map((line) => {
          const [name, type] = line.replace(/;$/, "").split(":").map((part) => part.trim());
          return [name, { type: type?.includes("number") ? "number" : type?.includes("boolean") ? "boolean" : "string" }];
        }));
        return JSON.stringify({ type: "object", properties }, null, 2);
      }
      if (slug === "regex-generator-from-text") {
        return value.split(/\r?\n/).filter(Boolean).map((line) => line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      }
      if (slug === "jwt-validator") {
        const parts = value.split(".");
        if (parts.length !== 3) return "Invalid JWT structure.";
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        const exp = payload.exp ? new Date(payload.exp * 1000) : null;
        return exp ? `Valid shape. Expires: ${exp.toLocaleString()}` : "Valid JWT structure. No exp claim found.";
      }
      if (slug === "bcrypt-hash-generator") {
        return output;
      }
      if (slug === "password-strength-checker") {
        const score = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].reduce((sum, pattern) => sum + (pattern.test(value) ? 1 : 0), value.length >= 12 ? 1 : 0);
        return `Strength: ${score >= 5 ? "Strong" : score >= 3 ? "Medium" : "Weak"}`;
      }
      if (slug === "random-string-generator") {
        return output;
      }
      return value;
    } catch (error) {
      return `Unable to process input: ${error.message}`;
    }
  }, [extra, output, slug, value]);

  const handleGenerate = async () => {
    if (slug === "bcrypt-hash-generator") setOutput(await bcrypt.hash(value, 10));
    if (slug === "random-string-generator") {
      const size = Math.max(8, Number(extra) || 16);
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
      setOutput(Array.from({ length: size }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(""));
    }
  };

  tool.copyValue = () => computed;
  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Handle a long-tail developer workflow directly in the browser."
      inputArea={
        <>
          <ToolInput label={slug === "typescript-to-json-schema-converter" ? "TypeScript fields" : "Input"}><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>
          {(slug === "json-to-typescript-interface-generator" || slug === "random-string-generator") ? <ToolInput label={slug === "random-string-generator" ? "Length" : "Interface name"}><input value={extra} onChange={(e) => setExtra(e.target.value)} /></ToolInput> : null}
          {(slug === "bcrypt-hash-generator" || slug === "random-string-generator") ? <ActionRow><button className="button" onClick={handleGenerate} type="button">{slug === "bcrypt-hash-generator" ? "Generate hash" : "Generate string"}</button></ActionRow> : null}
          {slug === "password-strength-checker" ? <InlineMessage tone="warning">This is a quick local heuristic, not a formal audit.</InlineMessage> : null}
        </>
      }
      outputArea={<ResultPanel value={computed || "Output will appear here."} />}
    />
  );
}

export function TextSeoTool({ tool, ...shellProps }) {
  const slug = tool.slug;
  const [value, setValue] = useState("alpha\nbravo\ncharlie");
  const [extra, setExtra] = useState("3");
  const output = useMemo(() => {
    if (slug === "character-frequency-analyzer") {
      const entries = [...new Map([...value].map((char) => [char, [...value].filter((item) => item === char).length])).entries()];
      return entries.map(([char, count]) => `${char === " " ? "[space]" : char}: ${count}`).join("\n");
    }
    if (slug === "reverse-words-in-sentence") return value.split(/\s+/).reverse().join(" ");
    if (slug === "random-line-picker") {
      const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      return lines.length ? lines[Math.floor(Math.random() * lines.length)] : "";
    }
    if (slug === "palindrome-checker") {
      const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
      return normalized && normalized === normalized.split("").reverse().join("") ? "Palindrome" : "Not a palindrome";
    }
    if (slug === "anagram-generator") {
      const chars = value.replace(/\s+/g, "").slice(0, 8).split("");
      const perms = new Set();
      const walk = (prefix, rest) => {
        if (perms.size >= 20) return;
        if (!rest.length) perms.add(prefix);
        rest.forEach((char, index) => walk(prefix + char, [...rest.slice(0, index), ...rest.slice(index + 1)]));
      };
      walk("", chars);
      return [...perms].join("\n");
    }
    return value;
  }, [slug, value]);

  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Solve a focused text-analysis or string-manipulation task." inputArea={<><ToolInput label="Text input"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>{slug === "random-line-picker" ? <ToolInput label="Unused option"><input value={extra} onChange={(e) => setExtra(e.target.value)} /></ToolInput> : null}</>} outputArea={<ResultPanel value={output || "Output will appear here."} />} />;
}

export function FileSeoTool({ tool, ...shellProps }) {
  const slug = tool.slug;
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Choose a file to begin.");
  const [output, setOutput] = useState("");

  const handleFile = async (nextFile) => {
    setFile(nextFile);
    if (!nextFile) return;
    const buffer = await nextFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (slug === "excel-to-csv-converter") {
      const workbook = XLSX.read(buffer);
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
      setOutput(csv);
      setStatus(`Converted ${nextFile.name} to CSV locally.`);
      return;
    }
    if (slug === "file-checksum-generator" || slug === "sha256-file-hash-generator") {
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      const value = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      setOutput(value);
      setStatus("Generated SHA-256 checksum locally.");
      return;
    }
    if (slug === "text-file-line-counter") {
      const text = await nextFile.text();
      setOutput(`Lines: ${text.split(/\r?\n/).length}`);
      setStatus("Counted lines locally.");
      return;
    }
    if (slug === "file-metadata-viewer") {
      setOutput(`Name: ${nextFile.name}\nType: ${nextFile.type || "unknown"}\nSize: ${bytesToSize(nextFile.size)}\nLast modified: ${new Date(nextFile.lastModified).toLocaleString()}`);
      setStatus("Read file metadata locally.");
      return;
    }
    if (slug === "image-metadata-exif-viewer") {
      const meta = await exifr.parse(nextFile).catch(() => null);
      setOutput(meta ? JSON.stringify(meta, null, 2) : "No EXIF metadata found.");
      setStatus("Read image EXIF locally.");
      return;
    }
    if (slug === "pdf-page-count-tool") {
      const pdf = await PDFDocument.load(bytes);
      setOutput(`Pages: ${pdf.getPageCount()}`);
      setStatus("Counted PDF pages locally.");
      return;
    }
    if (slug === "base64-file-preview-tool") {
      const reader = new FileReader();
      reader.onload = () => setOutput(String(reader.result || ""));
      reader.readAsDataURL(nextFile);
      setStatus("Created a Base64 preview locally.");
      return;
    }
    if (slug === "file-encoding-detector") {
      if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) setOutput("UTF-8 with BOM");
      else if (bytes.every((byte) => byte < 128)) setOutput("ASCII or UTF-8");
      else setOutput("Likely UTF-8 or another multibyte encoding");
      setStatus("Estimated file encoding locally.");
      return;
    }

    setOutput(`Name: ${nextFile.name}\nSize: ${bytesToSize(nextFile.size)}\nEstimated compressed size (70%): ${bytesToSize(nextFile.size * 0.7)}`);
    setStatus("Estimated file characteristics locally.");
  };

  tool.copyValue = () => output || status;
  return <ToolShell {...shellProps} tool={tool} instructions="Analyze or transform a file locally in the browser." inputArea={<><ToolInput label="File"><input type="file" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} /></ToolInput>{slug === "utf8-to-ascii-converter" || slug === "binary-to-text-converter" || slug === "text-to-binary-converter" ? null : <ActionRow><button className="button button--secondary" onClick={() => { setFile(null); setOutput(""); setStatus("Choose a file to begin."); }} type="button">Clear</button></ActionRow>}</>} outputArea={<div className="stack-sm"><ResultPanel value={status} />{output ? <ResultPanel value={output} /> : null}</div>} />;
}

export function EncodingSeoTool({ tool, ...shellProps }) {
  const slug = tool.slug;
  const [value, setValue] = useState(slug === "binary-to-text-converter" ? "01001000 01101001" : "Hi");
  const output = useMemo(() => slug === "binary-to-text-converter" ? textFromBinary(value) : slug === "text-to-binary-converter" ? binaryFromText(value) : value.normalize("NFKD").replace(/[^\x00-\x7F]/g, ""), [slug, value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Convert text between simple encodings locally." inputArea={<ToolInput label="Input"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output} />} />;
}

export function MathSeoTool({ tool, ...shellProps }) {
  const slug = tool.slug;
  const [value, setValue] = useState("1,2,2,4");
  const [extra, setExtra] = useState("3,4");
  const output = useMemo(() => {
    const stats = basicStats(String(value).split(/[,\n\s]+/).filter(Boolean).map(Number));
    if (slug === "average-calculator") return `Average: ${number(stats.average)}`;
    if (slug === "median-calculator") return `Median: ${number(stats.median)}`;
    if (slug === "mode-calculator") return `Mode: ${stats.mode.join(", ")}`;
    if (slug === "standard-deviation-calculator") return `Standard deviation: ${number(stats.standardDeviation)}`;
    if (slug === "variance-calculator") return `Variance: ${number(stats.variance)}`;
    if (slug === "weighted-average-calculator") {
      const values = String(value).split(/[,\s]+/).filter(Boolean).map(Number);
      const weights = String(extra).split(/[,\s]+/).filter(Boolean).map(Number);
      const totalWeight = weights.reduce((sum, item) => sum + item, 0) || 1;
      return `Weighted average: ${number(values.reduce((sum, item, index) => sum + item * (weights[index] || 0), 0) / totalWeight)}`;
    }
    if (slug === "z-score-calculator") return `Z-score: ${number((Number(extra) - stats.average) / (stats.standardDeviation || 1))}`;
    if (slug === "ratio-simplifier") {
      const [a, b] = String(value).split(/[,:]/).map((part) => Number(part.trim()) || 0);
      const gcd = (x, y) => y ? gcd(y, x % y) : x;
      const divisor = gcd(a, b) || 1;
      return `${a / divisor}:${b / divisor}`;
    }
    if (slug === "fraction-to-decimal-converter") {
      const [top, bottom] = String(value).split("/").map((part) => Number(part.trim()) || 0);
      return number(top / (bottom || 1));
    }
    if (slug === "decimal-to-fraction-converter") {
      const decimal = Number(value) || 0;
      const denominator = 1000;
      const numerator = Math.round(decimal * denominator);
      return `${numerator}/${denominator}`;
    }
    if (slug === "scientific-notation-converter") {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric.toExponential(6) : String(value);
    }
    if (slug === "quadratic-equation-solver") {
      const [a, b, c] = String(value).split(/[,\s]+/).filter(Boolean).map(Number);
      const discriminant = b ** 2 - 4 * a * c;
      const root1 = (-b + Math.sqrt(discriminant)) / (2 * a || 1);
      const root2 = (-b - Math.sqrt(discriminant)) / (2 * a || 1);
      return `x1 = ${number(root1)}, x2 = ${number(root2)}`;
    }
    if (slug === "pythagorean-theorem-calculator") {
      const [sideA, sideB] = String(value).split(/[,\s]+/).filter(Boolean).map(Number);
      return `Hypotenuse: ${number(Math.sqrt(sideA ** 2 + sideB ** 2))}`;
    }
    if (slug === "matrix-addition-calculator") {
      const left = parseMatrix(value);
      const right = parseMatrix(extra);
      return left.map((row, rowIndex) => row.map((cell, colIndex) => cell + (right[rowIndex]?.[colIndex] || 0)).join(", ")).join("\n");
    }
    if (slug === "matrix-determinant-calculator") {
      const matrix = parseMatrix(value);
      return matrix.length === 2 && matrix[0]?.length === 2 ? `Determinant: ${determinant2x2(matrix)}` : "Use a 2x2 matrix like: 1 2 / 3 4";
    }
    return "";
  }, [extra, slug, value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Solve a focused statistics, algebra, fraction, or matrix task." inputArea={<><ToolInput label="Input"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>{["weighted-average-calculator", "z-score-calculator", "matrix-addition-calculator"].includes(slug) ? <ToolInput label="Extra input"><textarea rows="8" value={extra} onChange={(e) => setExtra(e.target.value)} /></ToolInput> : null}</>} outputArea={<ResultPanel value={output} />} />;
}

export function ComparisonSeoTool({ tool, ...shellProps }) {
  const slug = tool.slug;
  const [a, setA] = useState("500");
  const [b, setB] = useState("650");
  const [c, setC] = useState("12");
  const output = useMemo(() => {
    const n1 = Number(a) || 0;
    const n2 = Number(b) || 0;
    const n3 = Number(c) || 1;
    if (slug === "cost-per-mile-calculator") return `Cost per mile: ${currency(n1 / Math.max(1, n2))}`;
    if (slug === "loan-comparison-calculator") return `Difference: ${currency(n2 - n1)} total payment`;
    if (slug === "investment-comparison-calculator") return `Better option: ${n2 > n1 ? "Option B" : "Option A"}`;
    if (slug === "subscription-comparison-calculator") return `Annual difference: ${currency((n2 - n1) * n3)}`;
    if (slug === "break-even-time-calculator") return `Break-even time: ${number(n1 / Math.max(1, n2))} periods`;
    return `Price per unit difference: ${currency((n2 / Math.max(1, n3)) - n1)}`;
  }, [a, b, c, slug]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Compare two costs or decision options using a compact input model." inputArea={<><div className="split-fields"><ToolInput label="Value A"><input value={a} onChange={(e) => setA(e.target.value)} /></ToolInput><ToolInput label="Value B"><input value={b} onChange={(e) => setB(e.target.value)} /></ToolInput><ToolInput label="Periods / units"><input value={c} onChange={(e) => setC(e.target.value)} /></ToolInput></div></>} outputArea={<ResultPanel value={output} />} />;
}
