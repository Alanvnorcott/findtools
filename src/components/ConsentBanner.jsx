import { useEffect, useState } from "react";
import { CONSENT_STORAGE_KEY, updateGoogleConsent } from "../lib/consent";

export function ConsentBanner() {
  const [choice, setChoice] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === "granted" || stored === "denied") {
      setChoice(stored);
      updateGoogleConsent(stored);
    }
    setReady(true);
  }, []);

  const saveChoice = (nextChoice) => {
    setChoice(nextChoice);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, nextChoice);
    }
    updateGoogleConsent(nextChoice);
  };

  if (!ready || choice) return null;

  return (
    <div className="consent-banner" role="dialog" aria-live="polite" aria-label="Cookie and analytics consent">
      <div className="consent-banner__copy">
        <strong>Privacy choice</strong>
        <p>
          Findtools uses Google Analytics only if you allow it. Tool input stays in your browser and is not uploaded or retained by the site.
        </p>
      </div>
      <div className="consent-banner__actions">
        <button className="button button--secondary" onClick={() => saveChoice("denied")} type="button">
          Decline
        </button>
        <button className="button" onClick={() => saveChoice("granted")} type="button">
          Accept analytics
        </button>
      </div>
    </div>
  );
}
