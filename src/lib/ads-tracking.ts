// Google Ads conversion tracking helper.
// 1) Paste your Google Ads conversion ID + label below (or set via env).
// 2) Make sure the gtag.js snippet in index.html uses the same AW-... ID.
//
// You can find these in Google Ads → Goals → Conversions → your action → Tag setup.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// TODO: paste your real values here (or set VITE_GOOGLE_ADS_CONVERSION_ID / _LABEL in .env)
const CONVERSION_ID =
  (import.meta.env.VITE_GOOGLE_ADS_CONVERSION_ID as string | undefined) || "AW-CONVERSION_ID";
const CONVERSION_LABEL =
  (import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL as string | undefined) || "CONVERSION_LABEL";

export const trackAdsConversion = (overrideLabel?: string) => {
  if (typeof window === "undefined") return;
  const id = CONVERSION_ID;
  const label = overrideLabel ?? CONVERSION_LABEL;
  if (!id || id === "AW-CONVERSION_ID" || !label || label === "CONVERSION_LABEL") {
    // Not configured yet — no-op (so dev doesn't fire test conversions).
    return;
  }
  if (typeof window.gtag !== "function") return;
  window.gtag("event", "conversion", {
    send_to: `${id}/${label}`,
  });
};
