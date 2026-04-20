import { Link } from "react-router-dom";
import { useState } from "react";
import { categories } from "../data/categories";
import { toolRegistry } from "../data/toolRegistry";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { PINNED_TOOLS_KEY, RECENT_TOOLS_KEY } from "../lib/storage";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { ToolGrid, ToolList } from "./common";

export function HomePage() {
  const [pinnedTools] = useLocalStorage(PINNED_TOOLS_KEY, []);
  const [recentTools] = useLocalStorage(RECENT_TOOLS_KEY, []);

  useDocumentMeta(
    "Findtools",
    "A browser-based utility workspace with fast tools for text, files, calculations, conversions, and technical tasks."
  );

  const pinned = toolRegistry.filter((tool) => pinnedTools.includes(tool.slug));
  const recent = recentTools
    .map((slug) => toolRegistry.find((tool) => tool.slug === slug))
    .filter(Boolean);

  return (
    <div className="stack">
      <section className="hero hero--compact">
        <div>
          <span className="eyebrow">Browser-only utility workspace</span>
          <h1>Practical tools for everyday work.</h1>
          <p>Search by task, pin what you use, and keep everything local to the browser.</p>
        </div>
        <div className="hero__stats hero__stats--compact">
          <div>
            <strong>{toolRegistry.length}</strong>
            <span>tools</span>
          </div>
          <div>
            <strong>{categories.length}</strong>
            <span>categories</span>
          </div>
          <div>
            <strong>Local</strong>
            <span>processing only</span>
          </div>
        </div>
      </section>

      <section className="toolbar toolbar--note">
        <p>Use the search button in the header to jump to tools from any page.</p>
      </section>

      {pinned.length ? (
        <section className="stack">
          <div className="section-heading">
            <h2>Pinned tools</h2>
            <p>Saved locally in your browser.</p>
          </div>
          <ToolList tools={pinned} />
        </section>
      ) : null}

      {recent.length ? (
        <section className="stack">
          <div className="section-heading">
            <h2>Recent tools</h2>
            <p>Your last few tools from this device.</p>
          </div>
          <ToolList tools={recent} />
        </section>
      ) : null}

      <section className="stack">
        <div className="section-heading">
          <h2>Browse by category</h2>
          <p>One registry powers search, routing, categories, and future expansion.</p>
        </div>
        <div className="tool-list tool-list--compact">
          {categories.map((category) => {
            const tools = toolRegistry.filter((tool) => tool.category === category.slug);
            return (
              <Link className="tool-list__item tool-list__item--category" key={category.slug} to={`/category/${category.slug}`}>
                <span>{category.name}</span>
                <small>{tools.length} tools</small>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <div className="section-heading">
          <h2>All tools</h2>
          <p>{toolRegistry.length} available tools.</p>
        </div>
        <ToolList tools={toolRegistry} />
      </section>
    </div>
  );
}
