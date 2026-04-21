export const CONSENT_STORAGE_KEY = "findtools-consent-choice";

export function updateGoogleConsent(choice) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  const granted = choice === "granted";
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
    functionality_storage: "granted",
    security_storage: "granted"
  });
}
