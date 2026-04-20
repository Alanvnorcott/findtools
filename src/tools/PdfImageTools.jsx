import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ActionRow, ResultPanel, ToolInput } from "../components/common";
import { ToolShell } from "../components/ToolShell";
import { downloadBlob } from "../lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export function PdfToImagesTool({ tool, ...shellProps }) {
  const [file, setFile] = useState(null);
  const [scale, setScale] = useState("1.5");
  const [status, setStatus] = useState("Choose a PDF to render each page as a PNG image.");
  const [previews, setPreviews] = useState([]);
  tool.copyValue = () => status;

  const convert = async () => {
    if (!file) return setStatus("Choose a PDF first.");
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const nextPreviews = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: Math.max(0.5, Number(scale) || 1.5) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      downloadBlob(blob, `${file.name.replace(/\.pdf$/i, "")}-page-${pageNumber}.png`);
      nextPreviews.push({ pageNumber, src: canvas.toDataURL("image/png") });
    }
    setPreviews(nextPreviews);
    setStatus(`Rendered ${nextPreviews.length} PDF pages into PNG downloads.`);
  };

  return <ToolShell {...shellProps} tool={tool} instructions="Render PDF pages into PNG images entirely in the browser." inputArea={<><ToolInput label="PDF file"><input accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} type="file" /></ToolInput><ToolInput label="Render scale"><input value={scale} onChange={(e) => setScale(e.target.value)} /></ToolInput><ActionRow><button className="button" onClick={convert} type="button">Convert to images</button><button className="button button--secondary" onClick={() => { setFile(null); setPreviews([]); setStatus("Choose a PDF to render each page as a PNG image."); }} type="button">Reset</button></ActionRow></>} outputArea={<div className="stack-sm"><ResultPanel value={status} />{previews.length ? <ResultPanel title="Preview">{<div className="stack-sm">{previews.slice(0, 4).map((preview) => <img key={preview.pageNumber} alt={`PDF page ${preview.pageNumber}`} src={preview.src} style={{ display: "block", maxWidth: "100%" }} />)}</div>}</ResultPanel> : null}</div>} />;
}
