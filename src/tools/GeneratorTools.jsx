import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ActionRow, KeyValueList, ResultPanel, ToolInput } from "../components/common";
import { ToolShell } from "../components/ToolShell";

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function PasswordGeneratorTool({ tool, ...shellProps }) {
  const [length, setLength] = useState(16);
  const [password, setPassword] = useState("");
  const generate = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    setPassword(Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
  };
  tool.copyValue = () => password;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate a strong password locally." inputArea={<><ToolInput label="Length"><input max="64" min="8" type="range" value={length} onChange={(e) => setLength(Number(e.target.value))} /></ToolInput><ActionRow><button className="button" onClick={generate} type="button">Generate password</button><button className="button button--secondary" onClick={() => { setLength(16); setPassword(""); }} type="button">Reset</button></ActionRow></>} outputArea={<ResultPanel value={password || "Generate a password to see it here."} />} />;
}

export function PasswordPhraseGeneratorTool({ tool, ...shellProps }) {
  const words = ["quiet", "signal", "copper", "lumen", "river", "atlas", "harbor", "cinder", "maple", "cobalt"];
  const [phrase, setPhrase] = useState("");
  tool.copyValue = () => phrase;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate a readable password phrase from an offline word list." inputArea={<ActionRow><button className="button" onClick={() => setPhrase(Array.from({ length: 4 }, () => randomFrom(words)).join("-"))} type="button">Generate phrase</button></ActionRow>} outputArea={<ResultPanel value={phrase || "Generate a password phrase to see it here."} />} />;
}

export function UsernameGeneratorTool({ tool, ...shellProps }) {
  const adjectives = ["quiet", "steady", "bright", "clear", "calm", "sharp"];
  const nouns = ["atlas", "forge", "harbor", "vector", "studio", "signal"];
  const [output, setOutput] = useState("");
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate clean username ideas." inputArea={<ActionRow><button className="button" onClick={() => setOutput(`${randomFrom(adjectives)}-${randomFrom(nouns)}-${Math.floor(Math.random() * 900 + 100)}`)} type="button">Generate username</button></ActionRow>} outputArea={<ResultPanel value={output || "Generate a username to see it here."} />} />;
}

export function RandomNumberGeneratorTool({ tool, ...shellProps }) {
  const [min, setMin] = useState("1");
  const [max, setMax] = useState("100");
  const [count, setCount] = useState("5");
  const output = useMemo(() => {
    const lower = Number(min);
    const upper = Number(max);
    const total = Number(count);
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || !Number.isFinite(total) || upper < lower) return "";
    return Array.from({ length: total }, () => Math.floor(Math.random() * (upper - lower + 1)) + lower).join(", ");
  }, [count, max, min]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate one or more random integers inside a range." inputArea={<><div className="split-fields"><ToolInput label="Min"><input value={min} onChange={(e) => setMin(e.target.value)} /></ToolInput><ToolInput label="Max"><input value={max} onChange={(e) => setMax(e.target.value)} /></ToolInput><ToolInput label="Count"><input value={count} onChange={(e) => setCount(e.target.value)} /></ToolInput></div><ActionRow><button className="button button--secondary" onClick={() => { setMin("1"); setMax("100"); setCount("5"); }} type="button">Reset</button></ActionRow></>} outputArea={<ResultPanel value={output} />} />;
}

export function LoremIpsumGeneratorTool({ tool, ...shellProps }) {
  const [paragraphs, setParagraphs] = useState("3");
  const base = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Donec ullamcorper nulla non metus auctor fringilla.";
  const output = useMemo(() => Array.from({ length: Number(paragraphs) || 0 }, () => base).join("\n\n"), [paragraphs]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate placeholder paragraphs for layouts or mockups." inputArea={<><ToolInput label="Paragraphs"><input value={paragraphs} onChange={(e) => setParagraphs(e.target.value)} /></ToolInput><ActionRow><button className="button button--secondary" onClick={() => setParagraphs("3")} type="button">Reset</button></ActionRow></>} outputArea={<ResultPanel value={output} />} />;
}

export function QrCodeGeneratorTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("https://example.com");
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => { QRCode.toDataURL(value, { margin: 1, width: 240 }).then(setDataUrl); }, [value]);
  tool.copyValue = () => value;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate a QR code entirely in the browser." inputArea={<ToolInput label="Text or URL"><textarea rows="8" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel title="QR code">{dataUrl ? <img alt="QR code" src={dataUrl} style={{ display: "block", width: 240, maxWidth: "100%" }} /> : <pre>QR code will appear here.</pre>}</ResultPanel>} />;
}

export function ColorShadeGeneratorTool({ tool, ...shellProps }) {
  const [hex, setHex] = useState("#2563eb");
  const shades = useMemo(() => {
    const clean = hex.replace("#", "");
    const int = Number.parseInt(clean, 16);
    const base = [(int >> 16) & 255, (int >> 8) & 255, int & 255];
    return [0.2, 0.4, 0.6, 0.8, 1, 1.1, 1.2, 1.35].map((factor, index) => {
      const next = base.map((channel) => Math.max(0, Math.min(255, Math.round(channel * factor))));
      const value = `#${next.map((item) => item.toString(16).padStart(2, "0")).join("")}`;
      return { label: `Shade ${index + 1}`, value };
    });
  }, [hex]);
  tool.copyValue = () => shades.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Generate lighter and darker shades from a base color." inputArea={<ToolInput label="Base hex color"><input value={hex} onChange={(e) => setHex(e.target.value)} /></ToolInput>} outputArea={<ResultPanel><div className="stack-sm">{shades.map((shade) => <div className="kv-list__row" key={shade.label}><dt>{shade.value}</dt><dd><span className="swatch" style={{ background: shade.value }} /></dd></div>)}</div></ResultPanel>} />;
}

export function GradientGeneratorTool({ tool, ...shellProps }) {
  const [from, setFrom] = useState("#111827");
  const [to, setTo] = useState("#6b7280");
  const [angle, setAngle] = useState("90");
  const output = `linear-gradient(${angle}deg, ${from}, ${to})`;
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Create a simple CSS linear gradient." inputArea={<><div className="split-fields"><ToolInput label="From"><input value={from} onChange={(e) => setFrom(e.target.value)} /></ToolInput><ToolInput label="To"><input value={to} onChange={(e) => setTo(e.target.value)} /></ToolInput><ToolInput label="Angle"><input value={angle} onChange={(e) => setAngle(e.target.value)} /></ToolInput></div></>} outputArea={<ResultPanel title="Gradient"><div className="stack-sm"><div className="preview-box" style={{ background: output }} /><pre>{output}</pre></div></ResultPanel>} />;
}

export function FakeNameGeneratorTool({ tool, ...shellProps }) {
  const first = ["Ava", "Maya", "Luca", "Noah", "Iris", "Owen", "Jules", "Nina"];
  const last = ["Carter", "Bennett", "Foster", "Morris", "Harper", "Sullivan", "Reed", "Parker"];
  const cities = ["Denver", "Austin", "Portland", "Chicago", "Boise", "Seattle"];
  const [profile, setProfile] = useState([]);
  const generate = () => {
    const fullName = `${randomFrom(first)} ${randomFrom(last)}`;
    setProfile([
      { label: "Name", value: fullName },
      { label: "Email", value: `${fullName.toLowerCase().replace(/\s+/g, ".")}@example.test` },
      { label: "City", value: randomFrom(cities) }
    ]);
  };
  tool.copyValue = () => profile.map((item) => `${item.label}: ${item.value}`).join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Generate a simple fake identity from an offline sample dataset." inputArea={<ActionRow><button className="button" onClick={generate} type="button">Generate profile</button></ActionRow>} outputArea={<ResultPanel><KeyValueList items={profile} /></ResultPanel>} />;
}

export function CompanyNameGeneratorTool({ tool, ...shellProps }) {
  const left = ["North", "Clear", "Signal", "Field", "Quiet", "Open"];
  const right = ["Works", "Labs", "Studio", "Systems", "Supply", "Collective"];
  const [value, setValue] = useState("");
  tool.copyValue = () => value;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate simple company name ideas." inputArea={<ActionRow><button className="button" onClick={() => setValue(`${randomFrom(left)} ${randomFrom(right)}`)} type="button">Generate company name</button></ActionRow>} outputArea={<ResultPanel value={value || "Generate a company name to see it here."} />} />;
}

export function HexColorGeneratorTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("");
  tool.copyValue = () => value;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate a random hex color value." inputArea={<ActionRow><button className="button" onClick={() => setValue(`#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`)} type="button">Generate color</button></ActionRow>} outputArea={<ResultPanel><div className="stack-sm"><div className="preview-box" style={{ height: 72, background: value || "transparent" }} /><pre>{value || "Generate a color to see it here."}</pre></div></ResultPanel>} />;
}

export function DiceRollerTool({ tool, ...shellProps }) {
  const [count, setCount] = useState("2");
  const [sides, setSides] = useState("6");
  const [value, setValue] = useState("");
  const roll = () => {
    const total = Math.max(1, Number(count) || 1);
    const max = Math.max(2, Number(sides) || 6);
    setValue(Array.from({ length: total }, () => Math.floor(Math.random() * max) + 1).join(", "));
  };
  tool.copyValue = () => value;
  return <ToolShell {...shellProps} tool={tool} instructions="Roll one or more dice with a chosen number of sides." inputArea={<><div className="split-fields"><ToolInput label="Dice"><input value={count} onChange={(e) => setCount(e.target.value)} /></ToolInput><ToolInput label="Sides"><input value={sides} onChange={(e) => setSides(e.target.value)} /></ToolInput></div><ActionRow><button className="button" onClick={roll} type="button">Roll dice</button></ActionRow></>} outputArea={<ResultPanel value={value || "Roll to see results."} />} />;
}

export function YesNoPickerTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("");
  tool.copyValue = () => value;
  return <ToolShell {...shellProps} tool={tool} instructions="Pick a simple yes or no answer at random." inputArea={<ActionRow><button className="button" onClick={() => setValue(Math.random() < 0.5 ? "Yes" : "No")} type="button">Pick one</button></ActionRow>} outputArea={<ResultPanel value={value || "Pick to see an answer."} />} />;
}

export function ColorPaletteGeneratorTool({ tool, ...shellProps }) {
  const [palette, setPalette] = useState([]);
  const generate = () => setPalette(Array.from({ length: 5 }, () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`));
  tool.copyValue = () => palette.join("\n");
  return <ToolShell {...shellProps} tool={tool} instructions="Generate a five-color palette." inputArea={<ActionRow><button className="button" onClick={generate} type="button">Generate palette</button></ActionRow>} outputArea={<ResultPanel><div className="stack-sm">{palette.length ? palette.map((color) => <div className="kv-list__row" key={color}><dt>{color}</dt><dd><span className="swatch" style={{ background: color }} /></dd></div>) : <pre>Generate a palette to see colors here.</pre>}</div></ResultPanel>} />;
}

export function CouponCodeGeneratorTool({ tool, ...shellProps }) {
  const [length, setLength] = useState("10");
  const [value, setValue] = useState("");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const generate = () => {
    const size = Math.max(4, Number(length) || 10);
    setValue(Array.from({ length: size }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(""));
  };
  tool.copyValue = () => value;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate a clean coupon or promo code with readable characters." inputArea={<><ToolInput label="Code length"><input value={length} onChange={(e) => setLength(e.target.value)} /></ToolInput><ActionRow><button className="button" onClick={generate} type="button">Generate code</button></ActionRow></>} outputArea={<ResultPanel value={value || "Generate a code to see it here."} />} />;
}

export function RandomDateGeneratorTool({ tool, ...shellProps }) {
  const [start, setStart] = useState("2026-01-01");
  const [end, setEnd] = useState("2026-12-31");
  const [value, setValue] = useState("");
  const generate = () => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const min = Math.min(startTime, endTime);
    const max = Math.max(startTime, endTime);
    const random = new Date(min + Math.random() * (max - min));
    setValue(random.toISOString().slice(0, 10));
  };
  tool.copyValue = () => value;
  return <ToolShell {...shellProps} tool={tool} instructions="Generate a random date between two calendar dates." inputArea={<><div className="split-fields"><ToolInput label="Start date"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></ToolInput><ToolInput label="End date"><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></ToolInput></div><ActionRow><button className="button" onClick={generate} type="button">Generate date</button></ActionRow></>} outputArea={<ResultPanel value={value || "Generate a date to see it here."} />} />;
}

export function AcronymGeneratorTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("Findtools utility workspace");
  const output = useMemo(() => value.split(/\s+/).map((word) => word.trim()).filter(Boolean).map((word) => word[0]?.toUpperCase() || "").join(""), [value]);
  tool.copyValue = () => output;
  return <ToolShell {...shellProps} tool={tool} instructions="Turn a phrase into an acronym using the first letter of each word." inputArea={<ToolInput label="Phrase"><input value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput>} outputArea={<ResultPanel value={output || "Enter a phrase to see an acronym."} />} />;
}
