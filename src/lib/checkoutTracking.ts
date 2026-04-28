import { supabase } from "@/integrations/supabase/client";

const CLIENT_ID_KEY = "pixcellor_checkout_client_id";
const SESSION_ID_KEY = "pixcellor_checkout_session_id";
export const FALL_OFF_CONSENT_KEY = "pixcellor_falloff_consent";

const getCheckoutClientId = () => {
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;

  const id = `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem(CLIENT_ID_KEY, id);
  return id;
};

const getSessionId = () => {
  const existing = sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;

  const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  sessionStorage.setItem(SESSION_ID_KEY, id);
  return id;
};

export const hasFalloffConsent = () => localStorage.getItem(FALL_OFF_CONSENT_KEY) === "granted";

export const setFalloffConsent = (granted: boolean) => {
  localStorage.setItem(FALL_OFF_CONSENT_KEY, granted ? "granted" : "declined");
};

export const getCheckoutContext = () => ({
  clientId: getCheckoutClientId(),
  sessionId: getSessionId(),
  pageUrl: window.location.href,
  referrer: document.referrer || null,
  userAgent: navigator.userAgent,
  language: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  screen: `${window.screen.width}x${window.screen.height}`,
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  startedAt: new Date().toISOString(),
});

export const recordFalloff = async (metadata: Record<string, unknown> = {}) => {
  if (!hasFalloffConsent()) return;

  const context = getCheckoutContext();
  await (supabase as any)
    .from("visitor_falloffs")
    .upsert({
      visitor_id: context.clientId,
      session_id: context.sessionId,
      consent_status: "granted",
      first_page: context.pageUrl,
      last_page: context.pageUrl,
      referrer: context.referrer,
      user_agent: context.userAgent,
      browser_language: context.language,
      timezone: context.timezone,
      screen_size: context.screen,
      viewport_size: context.viewport,
      last_seen_at: new Date().toISOString(),
      metadata,
    }, { onConflict: "visitor_id,session_id" });
};