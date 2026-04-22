import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toolRegistry } from "../data/toolRegistry";

function rankTools(query) {
  const value = query.trim().toLowerCase();
  if (!value) return toolRegistry.slice(0, 12);

  return toolRegistry
    .map((tool) => {
      const name = tool.name.toLowerCase();
      const tags = tool.tags.join(" ").toLowerCase();
      const description = tool.shortDescription.toLowerCase();
      const aliases = (tool.aliases || []).join(" ").toLowerCase();
      const synonyms = (tool.synonyms || []).join(" ").toLowerCase();
      let score = 0;
      if (name.startsWith(value)) score += 6;
      if (name.includes(value)) score += 4;
      if (aliases.includes(value)) score += 4;
      if (synonyms.includes(value)) score += 3;
      if (tags.includes(value)) score += 2;
      if (description.includes(value)) score += 1;
      return { tool, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .slice(0, 24)
    .map((item) => item.tool);
}

export function SearchDialog({ open, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!open) {
          inputRef.current?.focus();
        }
      }
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (open) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
    return undefined;
  }, [onClose, open]);

  const results = useMemo(() => rankTools(query), [query]);

  if (!open) return null;

  return (
    <div className="search-modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="search-modal__panel" onClick={(event) => event.stopPropagation()}>
        <div className="search-modal__input">
          <span className="search-modal__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l5 5" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search tools by name, tag, or task"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="button button--secondary" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="search-modal__results">
          {results.length ? (
            results.map((tool) => (
              <Link className="search-result" key={tool.slug} onClick={onClose} to={`/${tool.slug}`}>
                <div>
                  <strong>{tool.name}</strong>
                  <p>{tool.shortDescription}</p>
                </div>
                <span className="chip">{tool.categoryName}</span>
              </Link>
            ))
          ) : (
            <div className="search-empty">No tools matched that search.</div>
          )}
        </div>
      </div>
    </div>
  );
}
