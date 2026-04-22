import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { copyText } from "../lib/utils";

export function SectionCard({ title, subtitle, actions, children }) {
  return (
    <section className="section-card">
      <header className="section-card__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="section-card__actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function ToolInput({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {hint ? <span className="field__hint">{hint}</span> : null}
      {children}
    </label>
  );
}

export function InlineMessage({ tone = "neutral", children }) {
  return <div className={`inline-message inline-message--${tone}`}>{children}</div>;
}

export function ResultPanel({ title = "Output", value, placeholder = "Output will appear here.", children }) {
  return (
    <div className="result-panel">
      <div className="result-panel__label">{title}</div>
      {children ?? <pre>{value || placeholder}</pre>}
    </div>
  );
}

export function KeyValueList({ items }) {
  return (
    <dl className="kv-list">
      {items.map((item) => (
        <div className="kv-list__row" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ActionRow({ children }) {
  return <div className="action-row">{children}</div>;
}

export function CopyButton({ getValue, label = "Copy" }) {
  const [status, setStatus] = useState("idle");

  const handleCopy = async () => {
    const value = typeof getValue === "function" ? getValue() : getValue;
    if (!value) return;

    try {
      await copyText(value);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("error");
    }
  };

  const buttonLabel = useMemo(() => {
    if (status === "copied") return "Copied";
    if (status === "error") return "Failed";
    return label;
  }, [label, status]);

  return (
    <button className="button button--secondary" onClick={handleCopy} type="button">
      {buttonLabel}
    </button>
  );
}

export function ToolGrid({ tools }) {
  return (
    <div className="tool-grid">
      {tools.map((tool) => (
        <Link className="tool-card" key={tool.slug} to={`/${tool.slug}`}>
          <div className="tool-card__meta">
            <span className="chip">{tool.categoryName}</span>
          </div>
          <h3>{tool.name}</h3>
          <p>{tool.shortDescription}</p>
          <div className="tool-card__tags">
            {tool.tags.slice(0, 3).map((tag) => (
              <span className="chip chip--soft" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function ToolList({ tools }) {
  return (
    <div className="tool-list">
      {tools.map((tool) => (
        <Link className="tool-list__item" key={tool.slug} to={`/${tool.slug}`}>
          <span>{tool.name}</span>
          <small>{tool.categoryName}</small>
        </Link>
      ))}
    </div>
  );
}
