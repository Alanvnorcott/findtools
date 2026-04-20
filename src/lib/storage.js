export const PINNED_TOOLS_KEY = "findtools:pinned-tools";
export const RECENT_TOOLS_KEY = "findtools:recent-tools";

export function addRecentTool(existing, slug) {
  return [slug, ...existing.filter((item) => item !== slug)].slice(0, 8);
}

export function togglePinnedTool(existing, slug) {
  return existing.includes(slug)
    ? existing.filter((item) => item !== slug)
    : [slug, ...existing].slice(0, 12);
}
