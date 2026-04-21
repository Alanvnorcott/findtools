import { useMemo, useState } from "react";
import { ActionRow, ResultPanel, ToolInput } from "../components/common";
import { ToolShell } from "../components/ToolShell";

function mdToHtml(value) {
  return value
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, "<br />");
}

function htmlToMd(value) {
  return value
    .replace(/<h1>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3>(.*?)<\/h3>/gi, "### $1\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
}

function baseTool(tool, shellProps, instructions, inputArea, output) {
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions={instructions} inputArea={inputArea} outputArea={<ResultPanel value={output} />} />;
}

export function MarkdownToHtmlTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("# Heading\n\nA **strong** line with *emphasis*.");
  return baseTool(tool, shellProps, "Convert simple Markdown to HTML.", <ToolInput label="Markdown"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, mdToHtml(value));
}

export function HtmlToMarkdownTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("<h1>Heading</h1><p>A <strong>strong</strong> line.</p>");
  return baseTool(tool, shellProps, "Convert basic HTML back to Markdown.", <ToolInput label="HTML"><textarea rows="14" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, htmlToMd(value));
}

export function TextToBase64Tool({ tool, ...shellProps }) {
  const [value, setValue] = useState("Findtools");
  return baseTool(tool, shellProps, "Convert plain text to Base64.", <ToolInput label="Text input"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, btoa(unescape(encodeURIComponent(value))));
}

export function Base64ToTextTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("RmluZFRvb2xz");
  const output = useMemo(() => {
    try {
      return decodeURIComponent(escape(atob(value)));
    } catch {
      return "Invalid Base64 input.";
    }
  }, [value]);
  return baseTool(tool, shellProps, "Convert Base64 text back to plain text.", <ToolInput label="Base64 input"><textarea rows="10" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function UnixTimestampToDateTool({ tool, ...shellProps }) {
  const [value, setValue] = useState(String(Math.floor(Date.now() / 1000)));
  const output = useMemo(() => new Date(Number(value) * 1000).toLocaleString(), [value]);
  return baseTool(tool, shellProps, "Convert a Unix timestamp to a local date.", <ToolInput label="Unix timestamp"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function DateToUnixTimestampTool({ tool, ...shellProps }) {
  const [value, setValue] = useState(new Date().toISOString().slice(0, 16));
  const output = useMemo(() => String(Math.floor(new Date(value).getTime() / 1000)), [value]);
  return baseTool(tool, shellProps, "Convert a date and time to a Unix timestamp.", <ToolInput label="Date and time"><input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function CelsiusToFahrenheitTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("20");
  const output = useMemo(() => `${((Number(value) * 9) / 5 + 32).toFixed(2)} F`, [value]);
  return baseTool(tool, shellProps, "Convert Celsius to Fahrenheit.", <ToolInput label="Celsius"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function FahrenheitToCelsiusTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("68");
  const output = useMemo(() => `${(((Number(value) - 32) * 5) / 9).toFixed(2)} C`, [value]);
  return baseTool(tool, shellProps, "Convert Fahrenheit to Celsius.", <ToolInput label="Fahrenheit"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function MilesToKilometersTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("10");
  const output = useMemo(() => `${(Number(value) * 1.609344).toFixed(3)} km`, [value]);
  return baseTool(tool, shellProps, "Convert miles to kilometers.", <ToolInput label="Miles"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function KilometersToMilesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("10");
  const output = useMemo(() => `${(Number(value) / 1.609344).toFixed(3)} mi`, [value]);
  return baseTool(tool, shellProps, "Convert kilometers to miles.", <ToolInput label="Kilometers"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function PoundsToKilogramsTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("180");
  const output = useMemo(() => `${(Number(value) * 0.45359237).toFixed(3)} kg`, [value]);
  return baseTool(tool, shellProps, "Convert pounds to kilograms.", <ToolInput label="Pounds"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function KilogramsToPoundsTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("82");
  const output = useMemo(() => `${(Number(value) / 0.45359237).toFixed(3)} lb`, [value]);
  return baseTool(tool, shellProps, "Convert kilograms to pounds.", <ToolInput label="Kilograms"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function BytesConverterTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("1048576");
  const output = useMemo(() => {
    const bytes = Number(value);
    return [`Bytes: ${bytes}`, `KB: ${(bytes / 1024).toFixed(2)}`, `MB: ${(bytes / 1024 / 1024).toFixed(2)}`, `GB: ${(bytes / 1024 / 1024 / 1024).toFixed(4)}`].join("\n");
  }, [value]);
  return baseTool(tool, shellProps, "Convert bytes into larger storage units.", <ToolInput label="Bytes"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function SecondsToHumanTimeTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("3671");
  const output = useMemo(() => {
    const total = Number(value);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }, [value]);
  return baseTool(tool, shellProps, "Convert seconds into hours, minutes, and seconds.", <ToolInput label="Seconds"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function InchesToCentimetersTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("12");
  const output = useMemo(() => `${(Number(value) * 2.54).toFixed(3)} cm`, [value]);
  return baseTool(tool, shellProps, "Convert inches to centimeters.", <ToolInput label="Inches"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function CentimetersToInchesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("30");
  const output = useMemo(() => `${(Number(value) / 2.54).toFixed(3)} in`, [value]);
  return baseTool(tool, shellProps, "Convert centimeters to inches.", <ToolInput label="Centimeters"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function MetersToFeetTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("10");
  const output = useMemo(() => `${(Number(value) * 3.28084).toFixed(3)} ft`, [value]);
  return baseTool(tool, shellProps, "Convert meters to feet.", <ToolInput label="Meters"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function FeetToMetersTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("32.8");
  const output = useMemo(() => `${(Number(value) / 3.28084).toFixed(3)} m`, [value]);
  return baseTool(tool, shellProps, "Convert feet to meters.", <ToolInput label="Feet"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function DegreesToRadiansTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("180");
  const output = useMemo(() => `${((Number(value) * Math.PI) / 180).toFixed(6)} rad`, [value]);
  return baseTool(tool, shellProps, "Convert degrees to radians.", <ToolInput label="Degrees"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function RadiansToDegreesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("3.141593");
  const output = useMemo(() => `${((Number(value) * 180) / Math.PI).toFixed(3)} deg`, [value]);
  return baseTool(tool, shellProps, "Convert radians to degrees.", <ToolInput label="Radians"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function MinutesToHoursTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("135");
  const output = useMemo(() => `${(Number(value) / 60).toFixed(3)} hours`, [value]);
  return baseTool(tool, shellProps, "Convert minutes to decimal hours.", <ToolInput label="Minutes"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function HoursToMinutesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("2.25");
  const output = useMemo(() => `${(Number(value) * 60).toFixed(2)} minutes`, [value]);
  return baseTool(tool, shellProps, "Convert decimal hours to minutes.", <ToolInput label="Hours"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function GallonsToLitersTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("5");
  const output = useMemo(() => `${(Number(value) * 3.78541).toFixed(3)} L`, [value]);
  return baseTool(tool, shellProps, "Convert US gallons to liters.", <ToolInput label="Gallons"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function LitersToGallonsTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("18.9");
  const output = useMemo(() => `${(Number(value) / 3.78541).toFixed(3)} gal`, [value]);
  return baseTool(tool, shellProps, "Convert liters to US gallons.", <ToolInput label="Liters"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function MphToKphTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("55");
  const output = useMemo(() => `${(Number(value) * 1.60934).toFixed(3)} km/h`, [value]);
  return baseTool(tool, shellProps, "Convert miles per hour to kilometers per hour.", <ToolInput label="MPH"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function KphToMphTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("100");
  const output = useMemo(() => `${(Number(value) / 1.60934).toFixed(3)} mph`, [value]);
  return baseTool(tool, shellProps, "Convert kilometers per hour to miles per hour.", <ToolInput label="KPH"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function AcresToSquareFeetTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("2");
  const output = useMemo(() => `${(Number(value) * 43560).toFixed(2)} sq ft`, [value]);
  return baseTool(tool, shellProps, "Convert acres to square feet.", <ToolInput label="Acres"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function SquareFeetToAcresTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("87120");
  const output = useMemo(() => `${(Number(value) / 43560).toFixed(4)} acres`, [value]);
  return baseTool(tool, shellProps, "Convert square feet to acres.", <ToolInput label="Square feet"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function SquareMetersToSquareFeetTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("10");
  const output = useMemo(() => `${(Number(value) * 10.7639).toFixed(3)} sq ft`, [value]);
  return baseTool(tool, shellProps, "Convert square meters to square feet.", <ToolInput label="Square meters"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function SquareFeetToSquareMetersTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("107.639");
  const output = useMemo(() => `${(Number(value) / 10.7639).toFixed(3)} sq m`, [value]);
  return baseTool(tool, shellProps, "Convert square feet to square meters.", <ToolInput label="Square feet"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function OuncesToGramsTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("16");
  const output = useMemo(() => `${(Number(value) * 28.3495).toFixed(3)} g`, [value]);
  return baseTool(tool, shellProps, "Convert ounces to grams.", <ToolInput label="Ounces"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function GramsToOuncesTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("454");
  const output = useMemo(() => `${(Number(value) / 28.3495).toFixed(3)} oz`, [value]);
  return baseTool(tool, shellProps, "Convert grams to ounces.", <ToolInput label="Grams"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function CupsToMillilitersTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("2");
  const output = useMemo(() => `${(Number(value) * 236.588).toFixed(2)} mL`, [value]);
  return baseTool(tool, shellProps, "Convert US cups to milliliters.", <ToolInput label="Cups"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}

export function MillilitersToCupsTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("473");
  const output = useMemo(() => `${(Number(value) / 236.588).toFixed(3)} cups`, [value]);
  return baseTool(tool, shellProps, "Convert milliliters to US cups.", <ToolInput label="Milliliters"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>, output);
}
