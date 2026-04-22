import { Suspense, lazy } from "react";
import { ResultPanel, ToolInput } from "./common";

const CodeEditorImpl = lazy(() => import("./CodeEditorImpl"));

function FallbackTextarea({ value, onChange, readOnly, minHeight = 220 }) {
  return (
    <textarea
      aria-label="Code editor fallback"
      readOnly={readOnly}
      rows={Math.max(8, Math.round(minHeight / 28))}
      style={{ minHeight }}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

export function CodeField({ label, hint, value, onChange, language, minHeight = 220, readOnly = false }) {
  return (
    <ToolInput hint={hint} label={label}>
      <Suspense fallback={<FallbackTextarea minHeight={minHeight} onChange={onChange} readOnly={readOnly} value={value} />}>
        <CodeEditorImpl
          ariaLabel={label}
          language={language}
          minHeight={minHeight}
          onChange={onChange}
          readOnly={readOnly}
          value={value}
        />
      </Suspense>
    </ToolInput>
  );
}

export function CodeResultPanel({ title = "Output", value, language, minHeight = 220 }) {
  return (
    <ResultPanel title={title}>
      <Suspense fallback={<FallbackTextarea minHeight={minHeight} readOnly value={value} />}>
        <CodeEditorImpl ariaLabel={title} language={language} minHeight={minHeight} readOnly value={value} />
      </Suspense>
    </ResultPanel>
  );
}
