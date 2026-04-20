import { adSlots, adsEnabled } from "../lib/ads";

export function AdSlot({ placement }) {
  const slot = adSlots[placement];
  if (!slot) return null;

  /* AD_SLOT: placement reserved for future monetization wiring */
  return (
    <div
      aria-hidden={!adsEnabled}
      className={`ad-slot${adsEnabled ? " ad-slot--enabled" : ""}`}
      data-ad-placement={placement}
      style={{ minHeight: slot.minHeight }}
    >
      {adsEnabled ? (
        <div className="ad-slot__placeholder">{slot.label}</div>
      ) : (
        <div className="ad-slot__placeholder ad-slot__placeholder--muted">{slot.label}</div>
      )}
    </div>
  );
}
