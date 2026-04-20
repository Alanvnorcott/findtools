import { Suspense, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { toolRegistry } from "../data/toolRegistry";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { addRecentTool, PINNED_TOOLS_KEY, RECENT_TOOLS_KEY, togglePinnedTool } from "../lib/storage";
import { trackEvent } from "../lib/analytics";

export function ToolPage() {
  const { toolSlug } = useParams();
  const tool = toolRegistry.find((entry) => entry.slug === toolSlug);
  const aliasMatch = !tool ? toolRegistry.find((entry) => (entry.aliases || []).includes(toolSlug)) : null;
  const [pinnedTools, setPinnedTools] = useLocalStorage(PINNED_TOOLS_KEY, []);
  const [recentTools, setRecentTools] = useLocalStorage(RECENT_TOOLS_KEY, []);

  useDocumentMeta(tool?.seoTitle, tool?.seoDescription ?? "Findtools tool");

  useEffect(() => {
    if (!tool) return;
    if (recentTools[0] === tool.slug) return;
    setRecentTools((existing) => addRecentTool(existing, tool.slug));
  }, [recentTools, setRecentTools, tool]);

  useEffect(() => {
    if (!tool) return;
    trackEvent("tool_view", { slug: tool.slug, category: tool.category });
  }, [tool]);

  if (aliasMatch) {
    return <Navigate to={`/tools/${aliasMatch.slug}`} replace />;
  }

  if (!tool) {
    return <Navigate to="/" replace />;
  }

  const Component = tool.component;

  return (
    <Suspense fallback={<div className="section-card">Loading tool…</div>}>
      <Component
        isPinned={pinnedTools.includes(tool.slug)}
        onTogglePinned={() => setPinnedTools((existing) => togglePinnedTool(existing, tool.slug))}
        tool={tool}
      />
    </Suspense>
  );
}
