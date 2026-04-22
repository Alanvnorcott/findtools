export const PINNED_TOOLS_KEY = "findtools:pinned-tools";
export const RECENT_TOOLS_KEY = "findtools:recent-tools";

export function asSlugList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim());
}

export function addRecentTool(existing, slug) {
  const safeExisting = asSlugList(existing);
  return [slug, ...safeExisting.filter((item) => item !== slug)].slice(0, 8);
}

export function togglePinnedTool(existing, slug) {
  const safeExisting = asSlugList(existing);
  return safeExisting.includes(slug)
    ? safeExisting.filter((item) => item !== slug)
    : [slug, ...safeExisting].slice(0, 12);
}
