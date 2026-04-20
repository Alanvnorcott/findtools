import { useDocumentMeta } from "../hooks/useDocumentMeta";

export function StaticPage({ title, description, children }) {
  useDocumentMeta(title, description);

  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Findtools</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <section className="section-card static-copy">{children}</section>
    </div>
  );
}
