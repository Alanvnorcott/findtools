import { Navigate, useParams } from "react-router-dom";
import { categories } from "../data/categories";
import { toolRegistry } from "../data/toolRegistry";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { ToolList } from "./common";

export function CategoryPage() {
  const { categorySlug } = useParams();
  const category = categories.find((item) => item.slug === categorySlug);
  const tools = category ? toolRegistry.filter((tool) => tool.category === category.slug) : [];

  useDocumentMeta(category?.name, category?.description ?? "Findtools category");

  if (!category) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Category</span>
          <h1>{category.name}</h1>
          <p>{category.description}</p>
        </div>
      </div>
      <ToolList tools={tools} />
    </div>
  );
}
