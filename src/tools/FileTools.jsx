import { useMemo, useState } from "react";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { ActionRow, KeyValueList, ResultPanel, ToolInput } from "../components/common";
import { ToolShell } from "../components/ToolShell";
import { bytesToSize, downloadBlob } from "../lib/utils";

async function readFileAsBytes(file) {
  return new Uint8Array(await file.arrayBuffer());
}

async function readImageDimensions(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => resolve({ width: img.width, height: img.height, url });
    img.onerror = reject;
    img.src = url;
  });
}

async function canvasBlobFromFile(file, type, quality, width, height, crop) {
  const { url } = await readImageDimensions(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement("canvas");
  const sx = crop?.x || 0;
  const sy = crop?.y || 0;
  const sw = crop?.width || img.width;
  const sh = crop?.height || img.height;
  canvas.width = width ?? sw;
  canvas.height = height ?? sh;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  URL.revokeObjectURL(url);
  return blob;
}

function parseRange(range, pageCount) {
  const pages = new Set();
  range.split(",").forEach((part) => {
    const [start, end] = part.split("-").map((item) => Number(item.trim()));
    if (Number.isFinite(start) && Number.isFinite(end)) {
      for (let page = start; page <= end; page += 1) pages.add(page - 1);
    } else if (Number.isFinite(start)) {
      pages.add(start - 1);
    }
  });
  return [...pages].filter((page) => page >= 0 && page < pageCount);
}

export function PdfMergeTool({ tool, ...shellProps }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("Select two or more PDF files.");
  tool.copyValue = () => status;
  const merge = async () => {
    if (files.length < 2) return setStatus("Select at least two PDF files.");
    const merged = await PDFDocument.create();
    for (const file of files) {
      const source = await PDFDocument.load(await readFileAsBytes(file));
      const copiedPages = await merged.copyPages(source, source.getPageIndices());
      copiedPages.forEach((page) => merged.addPage(page));
    }
    const bytes = await merged.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "merged.pdf");
    setStatus(`Merged ${files.length} files into merged.pdf`);
  };
  return <ToolShell {...shellProps} tool={tool} instructions="Merge multiple PDFs locally in the browser." inputArea={<><ToolInput label="PDF files"><input accept="application/pdf" multiple onChange={(e) => setFiles([...e.target.files])} type="file" /></ToolInput><ActionRow><button className="button" onClick={merge} type="button">Merge and download</button><button className="button button--secondary" onClick={() => setFiles([])} type="button">Clear</button></ActionRow></>} outputArea={<ResultPanel value={status} />} />;
}

export function PdfSplitTool({ tool, ...shellProps }) {
  const [file, setFile] = useState(null);
  const [range, setRange] = useState("1");
  const [status, setStatus] = useState("Choose a PDF and a page range like 1-3.");
  tool.copyValue = () => status;
  const split = async () => {
    if (!file) return setStatus("Choose a PDF file first.");
    const source = await PDFDocument.load(await readFileAsBytes(file));
    const output = await PDFDocument.create();
    const pages = parseRange(range, source.getPageCount());
    const copied = await output.copyPages(source, pages);
    copied.forEach((page) => output.addPage(page));
    const bytes = await output.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "split.pdf");
    setStatus(`Downloaded ${pages.length} pages.`);
  };
  return <ToolShell {...shellProps} tool={tool} instructions="Extract selected pages from a PDF." inputArea={<><ToolInput label="PDF file"><input accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" /></ToolInput><ToolInput label="Pages" hint="Use 1, 1-3, or 1,3,5"><input value={range} onChange={(e) => setRange(e.target.value)} /></ToolInput><ActionRow><button className="button" onClick={split} type="button">Split and download</button><button className="button button--secondary" onClick={() => { setFile(null); setRange("1"); }} type="button">Reset</button></ActionRow></>} outputArea={<ResultPanel value={status} />} />;
}

export function PdfExtractPagesTool(props) {
  return <PdfSplitTool {...props} />;
}

export function PdfRotateTool({ tool, ...shellProps }) {
  const [file, setFile] = useState(null);
  const [rotation, setRotation] = useState("90");
  const [status, setStatus] = useState("Choose a PDF to rotate.");
  tool.copyValue = () => status;
  const rotate = async () => {
    if (!file) return setStatus("Choose a PDF file first.");
    const pdf = await PDFDocument.load(await readFileAsBytes(file));
    pdf.getPages().forEach((page) => page.setRotation(degrees(Number(rotation))));
    const bytes = await pdf.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "rotated.pdf");
    setStatus(`Rotated all pages by ${rotation} degrees.`);
  };
  return <ToolShell {...shellProps} tool={tool} instructions="Rotate all pages in a PDF locally." inputArea={<><ToolInput label="PDF file"><input accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" /></ToolInput><ToolInput label="Rotation"><select value={rotation} onChange={(e) => setRotation(e.target.value)}><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></ToolInput><ActionRow><button className="button" onClick={rotate} type="button">Rotate and download</button></ActionRow></>} outputArea={<ResultPanel value={status} />} />;
}

function ImageTransformTool({ tool, mode, convertType, downloadName, ...shellProps }) {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(0.82);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [cropX, setCropX] = useState("0");
  const [cropY, setCropY] = useState("0");
  const [status, setStatus] = useState("Choose an image to begin.");
  const [meta, setMeta] = useState(null);

  const onFileChange = async (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    if (!nextFile) return setMeta(null);
    const dimensions = await readImageDimensions(nextFile);
    setMeta({ ...dimensions, size: nextFile.size, type: nextFile.type, name: nextFile.name });
    setWidth(String(dimensions.width));
    setHeight(String(dimensions.height));
    setCropX("0");
    setCropY("0");
  };

  const handleTransform = async () => {
    if (!file) return setStatus("Choose an image file first.");
    const blob = await canvasBlobFromFile(
      file,
      convertType ?? file.type,
      mode === "compress" ? quality : 0.92,
      mode === "resize" || mode === "convert" || mode === "crop" ? Number(width) : undefined,
      mode === "resize" || mode === "convert" || mode === "crop" ? Number(height) : undefined,
      mode === "crop" ? { x: Number(cropX), y: Number(cropY), width: Number(width), height: Number(height) } : undefined
    );
    downloadBlob(blob, downloadName);
    setStatus(`Downloaded ${downloadName} (${bytesToSize(blob.size)}).`);
  };

  tool.copyValue = () => status;

  return (
    <ToolShell
      {...shellProps}
      tool={tool}
      instructions="Choose an image, adjust values, and process it entirely in the browser."
      inputArea={
        <>
          <ToolInput label="Image file"><input accept="image/*" onChange={onFileChange} type="file" /></ToolInput>
          {mode === "compress" ? <ToolInput label="Quality"><input max="1" min="0.1" step="0.05" type="range" value={quality} onChange={(e) => setQuality(Number(e.target.value))} /></ToolInput> : null}
          {mode === "resize" || mode === "convert" || mode === "crop" ? (
            <div className="split-fields">
              <ToolInput label="Width"><input value={width} onChange={(e) => setWidth(e.target.value)} /></ToolInput>
              <ToolInput label="Height"><input value={height} onChange={(e) => setHeight(e.target.value)} /></ToolInput>
            </div>
          ) : null}
          {mode === "crop" ? (
            <div className="split-fields">
              <ToolInput label="Crop X"><input value={cropX} onChange={(e) => setCropX(e.target.value)} /></ToolInput>
              <ToolInput label="Crop Y"><input value={cropY} onChange={(e) => setCropY(e.target.value)} /></ToolInput>
            </div>
          ) : null}
          <ActionRow>
            <button className="button" onClick={handleTransform} type="button">Process and download</button>
            <button className="button button--secondary" onClick={() => { setFile(null); setMeta(null); setStatus("Choose an image to begin."); }} type="button">Clear</button>
          </ActionRow>
        </>
      }
      outputArea={
        <div className="stack-sm">
          {meta ? <ResultPanel title="Image details"><KeyValueList items={[{ label: "Name", value: meta.name }, { label: "Dimensions", value: `${meta.width} × ${meta.height}` }, { label: "Original size", value: bytesToSize(meta.size) }, { label: "Type", value: meta.type }]} /></ResultPanel> : null}
          <ResultPanel value={status} />
        </div>
      }
    />
  );
}

export function ImageCompressorTool(props) {
  return <ImageTransformTool {...props} mode="compress" downloadName="compressed.jpg" />;
}

export function ImageResizerTool(props) {
  return <ImageTransformTool {...props} mode="resize" downloadName="resized.png" />;
}

export function ImageCropperTool(props) {
  return <ImageTransformTool {...props} mode="crop" downloadName="cropped.png" />;
}

export function PngToJpgTool(props) {
  return <ImageTransformTool {...props} mode="convert" convertType="image/jpeg" downloadName="converted.jpg" />;
}

export function JpgToPngTool(props) {
  return <ImageTransformTool {...props} mode="convert" convertType="image/png" downloadName="converted.png" />;
}

export function ImageToBase64Tool({ tool, ...shellProps }) {
  const [file, setFile] = useState(null);
  const [output, setOutput] = useState("");
  tool.copyValue = () => output;
  const onChange = async (event) => {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    if (!next) return setOutput("");
    const reader = new FileReader();
    reader.onload = () => setOutput(String(reader.result || ""));
    reader.readAsDataURL(next);
  };
  return <ToolShell {...shellProps} tool={tool} instructions="Convert an image file into a Base64 data URL." inputArea={<><ToolInput label="Image file"><input accept="image/*" onChange={onChange} type="file" /></ToolInput><ActionRow><button className="button button--secondary" onClick={() => { setFile(null); setOutput(""); }} type="button">Clear</button></ActionRow></>} outputArea={<ResultPanel value={output} placeholder="Base64 output will appear here." />} />;
}

export function Base64ToImageTool({ tool, ...shellProps }) {
  const [value, setValue] = useState("");
  tool.copyValue = () => value;
  const download = async () => {
    if (!value.startsWith("data:image/")) return;
    const response = await fetch(value);
    const blob = await response.blob();
    downloadBlob(blob, "image-from-base64.png");
  };
  return <ToolShell {...shellProps} tool={tool} instructions="Paste a Base64 image data URL and preview or download it." inputArea={<><ToolInput label="Base64 data URL"><textarea rows="12" value={value} onChange={(e) => setValue(e.target.value)} /></ToolInput><ActionRow><button className="button" onClick={download} type="button">Download image</button><button className="button button--secondary" onClick={() => setValue("")} type="button">Clear</button></ActionRow></>} outputArea={<ResultPanel title="Preview">{value.startsWith("data:image/") ? <img alt="Base64 preview" src={value} style={{ maxWidth: "100%", display: "block" }} /> : <pre>Paste a Base64 image data URL to preview it here.</pre>}</ResultPanel>} />;
}

export function ImageMetadataViewerTool({ tool, ...shellProps }) {
  const [meta, setMeta] = useState([]);
  tool.copyValue = () => meta.map((item) => `${item.label}: ${item.value}`).join("\n");
  const onChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return setMeta([]);
    const details = await readImageDimensions(file);
    setMeta([
      { label: "Name", value: file.name },
      { label: "Type", value: file.type || "unknown" },
      { label: "Size", value: bytesToSize(file.size) },
      { label: "Width", value: String(details.width) },
      { label: "Height", value: String(details.height) }
    ]);
    URL.revokeObjectURL(details.url);
  };
  return <ToolShell {...shellProps} tool={tool} instructions="View basic image metadata directly in the browser." inputArea={<ToolInput label="Image file"><input accept="image/*" onChange={onChange} type="file" /></ToolInput>} outputArea={<ResultPanel><KeyValueList items={meta} /></ResultPanel>} />;
}

export function ImagesToPdfTool({ tool, ...shellProps }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("Choose one or more images to convert into a PDF.");
  tool.copyValue = () => status;
  const convert = async () => {
    if (!files.length) return setStatus("Choose image files first.");
    const pdf = await PDFDocument.create();
    for (const file of files) {
      const bytes = await readFileAsBytes(file);
      const embedded = file.type === "image/png" || file.name.toLowerCase().endsWith(".png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const page = pdf.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    }
    const output = await pdf.save();
    downloadBlob(new Blob([output], { type: "application/pdf" }), "images.pdf");
    setStatus(`Converted ${files.length} images into images.pdf.`);
  };
  return <ToolShell {...shellProps} tool={tool} instructions="Convert multiple images into a single PDF locally in the browser." inputArea={<><ToolInput label="Image files"><input accept="image/*" multiple onChange={(e) => setFiles([...e.target.files])} type="file" /></ToolInput><ActionRow><button className="button" onClick={convert} type="button">Convert and download</button><button className="button button--secondary" onClick={() => setFiles([])} type="button">Clear</button></ActionRow></>} outputArea={<ResultPanel value={status} />} />;
}

export function PdfPageReorderTool({ tool, ...shellProps }) {
  const [file, setFile] = useState(null);
  const [order, setOrder] = useState("2,1");
  const [status, setStatus] = useState("Choose a PDF and enter a page order like 2,1,3.");
  tool.copyValue = () => status;
  const reorder = async () => {
    if (!file) return setStatus("Choose a PDF first.");
    const source = await PDFDocument.load(await readFileAsBytes(file));
    const output = await PDFDocument.create();
    const pages = order.split(",").map((item) => Number(item.trim()) - 1).filter((item) => item >= 0 && item < source.getPageCount());
    const copied = await output.copyPages(source, pages);
    copied.forEach((page) => output.addPage(page));
    const bytes = await output.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "reordered.pdf");
    setStatus(`Reordered ${pages.length} pages into reordered.pdf.`);
  };
  return <ToolShell {...shellProps} tool={tool} instructions="Reorder PDF pages using a comma-separated page list." inputArea={<><ToolInput label="PDF file"><input accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" /></ToolInput><ToolInput label="Page order"><input value={order} onChange={(e) => setOrder(e.target.value)} /></ToolInput><ActionRow><button className="button" onClick={reorder} type="button">Reorder and download</button></ActionRow></>} outputArea={<ResultPanel value={status} />} />;
}

export function PdfPageDeleteTool({ tool, ...shellProps }) {
  const [file, setFile] = useState(null);
  const [pagesToDelete, setPagesToDelete] = useState("2");
  const [status, setStatus] = useState("Choose a PDF and list pages to delete.");
  tool.copyValue = () => status;
  const removePages = async () => {
    if (!file) return setStatus("Choose a PDF first.");
    const source = await PDFDocument.load(await readFileAsBytes(file));
    const deleteSet = new Set(parseRange(pagesToDelete, source.getPageCount()));
    const output = await PDFDocument.create();
    const keepPages = source.getPageIndices().filter((index) => !deleteSet.has(index));
    const copied = await output.copyPages(source, keepPages);
    copied.forEach((page) => output.addPage(page));
    const bytes = await output.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "pages-deleted.pdf");
    setStatus(`Deleted ${deleteSet.size} pages.`);
  };
  return <ToolShell {...shellProps} tool={tool} instructions="Delete selected pages from a PDF locally." inputArea={<><ToolInput label="PDF file"><input accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" /></ToolInput><ToolInput label="Pages to delete"><input value={pagesToDelete} onChange={(e) => setPagesToDelete(e.target.value)} /></ToolInput><ActionRow><button className="button" onClick={removePages} type="button">Delete pages and download</button></ActionRow></>} outputArea={<ResultPanel value={status} />} />;
}

export function PdfMetadataRemoverTool({ tool, ...shellProps }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Choose a PDF to strip metadata fields.");
  tool.copyValue = () => status;
  const clean = async () => {
    if (!file) return setStatus("Choose a PDF first.");
    const pdf = await PDFDocument.load(await readFileAsBytes(file));
    pdf.setTitle("");
    pdf.setAuthor("");
    pdf.setSubject("");
    pdf.setKeywords([]);
    pdf.setProducer("");
    pdf.setCreator("");
    const bytes = await pdf.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "metadata-removed.pdf");
    setStatus("Removed common PDF metadata fields.");
  };
  return <ToolShell {...shellProps} tool={tool} instructions="Remove common metadata fields from a PDF locally." inputArea={<><ToolInput label="PDF file"><input accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" /></ToolInput><ActionRow><button className="button" onClick={clean} type="button">Remove metadata</button></ActionRow></>} outputArea={<ResultPanel value={status} />} />;
}

export function ImageToWebpTool(props) {
  return <ImageTransformTool {...props} mode="convert" convertType="image/webp" downloadName="converted.webp" />;
}

export function WebpToPngTool(props) {
  return <ImageTransformTool {...props} mode="convert" convertType="image/png" downloadName="converted.png" />;
}

export function WebpToJpgTool(props) {
  return <ImageTransformTool {...props} mode="convert" convertType="image/jpeg" downloadName="converted.jpg" />;
}

export function ImageDimensionCheckerTool({ tool, ...shellProps }) {
  return <ImageMetadataViewerTool tool={tool} {...shellProps} />;
}

export function FaviconGeneratorTool({ tool, ...shellProps }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Choose a square image to generate common favicon sizes.");
  tool.copyValue = () => status;
  const generate = async () => {
    if (!file) return setStatus("Choose an image first.");
    const sizes = [16, 32, 48, 96, 180];
    for (const size of sizes) {
      const blob = await canvasBlobFromFile(file, "image/png", 0.92, size, size);
      downloadBlob(blob, `favicon-${size}.png`);
    }
    setStatus("Generated favicon PNG files in common sizes.");
  };
  return <ToolShell {...shellProps} tool={tool} instructions="Generate common favicon PNG sizes locally in the browser." inputArea={<><ToolInput label="Source image"><input accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" /></ToolInput><ActionRow><button className="button" onClick={generate} type="button">Generate favicons</button></ActionRow></>} outputArea={<ResultPanel value={status} />} />;
}

export function SocialMediaImageCropperTool({ tool, ...shellProps }) {
  const [preset, setPreset] = useState("1200x630");
  const sizeMap = { "1200x630": [1200, 630], "1080x1080": [1080, 1080], "1080x1920": [1080, 1920] };
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Choose an image and export a social crop preset.");
  tool.copyValue = () => status;
  const exportPreset = async () => {
    if (!file) return setStatus("Choose an image first.");
    const [width, height] = sizeMap[preset];
    const blob = await canvasBlobFromFile(file, "image/png", 0.92, width, height);
    downloadBlob(blob, `social-${preset}.png`);
    setStatus(`Exported ${preset} crop preset.`);
  };
  return <ToolShell {...shellProps} tool={tool} instructions="Export an image to a common social-media aspect preset." inputArea={<><ToolInput label="Preset"><select value={preset} onChange={(e) => setPreset(e.target.value)}><option value="1200x630">Open Graph 1200x630</option><option value="1080x1080">Square 1080x1080</option><option value="1080x1920">Story 1080x1920</option></select></ToolInput><ToolInput label="Image file"><input accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" /></ToolInput><ActionRow><button className="button" onClick={exportPreset} type="button">Export preset</button></ActionRow></>} outputArea={<ResultPanel value={status} />} />;
}

export function PdfWatermarkTool({ tool, ...shellProps }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("Findtools");
  const [status, setStatus] = useState("Choose a PDF and watermark text.");
  tool.copyValue = () => status;

  const watermark = async () => {
    if (!file) return setStatus("Choose a PDF first.");
    const pdf = await PDFDocument.load(await readFileAsBytes(file));
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width * 0.18,
        y: height * 0.45,
        size: Math.max(24, Math.min(width, height) / 12),
        font,
        color: rgb(0.45, 0.45, 0.45),
        rotate: degrees(35),
        opacity: 0.28
      });
    });
    const bytes = await pdf.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "watermarked.pdf");
    setStatus("Added a watermark to each PDF page.");
  };

  return <ToolShell {...shellProps} tool={tool} instructions="Add a repeated text watermark to every page of a PDF locally." inputArea={<><ToolInput label="PDF file"><input accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" /></ToolInput><ToolInput label="Watermark text"><input value={text} onChange={(e) => setText(e.target.value)} /></ToolInput><ActionRow><button className="button" onClick={watermark} type="button">Watermark and download</button></ActionRow></>} outputArea={<ResultPanel value={status} />} />;
}

export function PdfCompressorTool({ tool, ...shellProps }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Choose a PDF to resave with object stream compression.");
  const [details, setDetails] = useState([]);
  tool.copyValue = () => status;

  const compress = async () => {
    if (!file) return setStatus("Choose a PDF first.");
    const sourceBytes = await readFileAsBytes(file);
    const pdf = await PDFDocument.load(sourceBytes);
    const bytes = await pdf.save({ useObjectStreams: true, updateFieldAppearances: false });
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "compressed.pdf");
    setDetails([
      { label: "Original size", value: bytesToSize(sourceBytes.byteLength) },
      { label: "Compressed size", value: bytesToSize(bytes.byteLength) },
      { label: "Saved", value: bytes.byteLength < sourceBytes.byteLength ? bytesToSize(sourceBytes.byteLength - bytes.byteLength) : "0 B" }
    ]);
    setStatus("Resaved PDF with browser-side compression settings.");
  };

  return <ToolShell {...shellProps} tool={tool} instructions="Reduce PDF size by resaving the file with object stream compression." inputArea={<><ToolInput label="PDF file"><input accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" /></ToolInput><ActionRow><button className="button" onClick={compress} type="button">Compress and download</button></ActionRow></>} outputArea={<div className="stack-sm"><ResultPanel value={status} />{details.length ? <ResultPanel title="Size breakdown"><KeyValueList items={details} /></ResultPanel> : null}</div>} />;
}
