import { adSlots, adsEnabled } from "../lib/ads";

export function AdSlot({ placement }) {
  const slot = adSlots[placement];
  if (!slot || !adsEnabled) return null;

  /* AD_SLOT: placement reserved for future monetization wiring */
  return (
    <div
      aria-hidden="true"
      className="ad-slot ad-slot--enabled"
      data-ad-placement={placement}
      style={{ minHeight: slot.minHeight }}
    />
  );
}
