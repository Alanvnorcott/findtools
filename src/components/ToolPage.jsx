import { Suspense, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { toolRegistry } from "../data/toolRegistry";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { addRecentTool, PINNED_TOOLS_KEY, RECENT_TOOLS_KEY, togglePinnedTool } from "../lib/storage";
import { trackEvent } from "../lib/analytics";
import { enrichToolForSeo } from "../lib/seoGraph";

export function ToolPage() {
  const { toolSlug } = useParams();
  const tool = toolRegistry.find((entry) => entry.slug === toolSlug);
  const aliasMatch = !tool ? toolRegistry.find((entry) => (entry.aliases || []).includes(toolSlug)) : null;
  const resolvedTool = tool ? enrichToolForSeo(tool, toolRegistry) : null;
  const [pinnedTools, setPinnedTools] = useLocalStorage(PINNED_TOOLS_KEY, []);
  const [recentTools, setRecentTools] = useLocalStorage(RECENT_TOOLS_KEY, []);

  useDocumentMeta(resolvedTool?.seoTitle, resolvedTool?.seoDescription ?? "Findtools tool");

  useEffect(() => {
    if (!resolvedTool) return;
    if (recentTools[0] === resolvedTool.slug) return;
    setRecentTools((existing) => addRecentTool(existing, resolvedTool.slug));
  }, [recentTools, resolvedTool, setRecentTools]);

  useEffect(() => {
    if (!resolvedTool) return;
    trackEvent("tool_view", { slug: resolvedTool.slug, category: resolvedTool.category, keyword: resolvedTool.primaryKeyword });
  }, [resolvedTool]);

  if (aliasMatch) {
    return <Navigate to={`/tools/${aliasMatch.slug}`} replace />;
  }

  if (!resolvedTool) {
    return <Navigate to="/" replace />;
  }

  const Component = resolvedTool.component;

  return (
    <Suspense fallback={<div className="section-card">Loading tool…</div>}>
      <Component
        isPinned={pinnedTools.includes(tool.slug)}
        onTogglePinned={() => setPinnedTools((existing) => togglePinnedTool(existing, resolvedTool.slug))}
        tool={resolvedTool}
      />
    </Suspense>
  );
}
