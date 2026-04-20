export const adsEnabled = typeof import.meta !== "undefined" && import.meta.env?.VITE_ENABLE_ADS === "true";

export const adSlots = {
  TOOL_TOP: { label: "Ad slot: tool top", minHeight: 88, size: "responsive" },
  TOOL_BOTTOM: { label: "Ad slot: tool bottom", minHeight: 88, size: "responsive" },
  SIDEBAR: { label: "Ad slot: sidebar", minHeight: 280, size: "300x250" }
};
