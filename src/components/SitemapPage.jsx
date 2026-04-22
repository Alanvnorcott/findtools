import { Link } from "react-router-dom";
import { categories } from "../data/categories";
import { toolRegistry } from "../data/toolRegistry";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

export function SitemapPage() {
  useDocumentMeta("Sitemap", "Browse all Findtools categories, tools, and core site pages.");

  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Home / Sitemap</span>
          <h1>Sitemap</h1>
          <p>Browse the full tool index in a compact directory view.</p>
        </div>
      </div>

      <section className="sitemap-section">
        <h2>Site</h2>
        <div className="tool-list tool-list--compact">
          <Link className="tool-list__item" to="/">Home</Link>
          <Link className="tool-list__item" to="/about">About Us</Link>
          <Link className="tool-list__item" to="/privacy">Privacy Policy</Link>
          <Link className="tool-list__item" to="/terms">Terms of Use</Link>
          <Link className="tool-list__item" to="/sitemap">Sitemap</Link>
        </div>
      </section>

      {categories.map((category) => {
        const tools = toolRegistry.filter((tool) => tool.category === category.slug);
        return (
          <section className="sitemap-section" key={category.slug}>
            <div className="sitemap-section__header">
              <h2>{category.name}</h2>
              <p>{category.description}</p>
            </div>
            <div className="tool-list tool-list--dense">
              {tools.map((tool) => (
                <Link className="tool-list__item" key={tool.slug} to={`/${tool.slug}`}>
                  {tool.name}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
