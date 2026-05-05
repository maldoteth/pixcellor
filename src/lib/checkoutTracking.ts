import { supabase } from "@/integrations/supabase/client";

const CLIENT_ID_KEY = "pixcellor_checkout_client_id";
const SESSION_ID_KEY = "pixcellor_checkout_session_id";
const VISIT_RECORDED_KEY = "pixcellor_visit_falloff_recorded";
export const FALL_OFF_CONSENT_KEY = "pixcellor_falloff_consent";
const CHECKOUT_PENDING_KEY = "pixcellor_checkout_pending";
const CHECKOUT_PENDING_HANDLED_KEY = "pixcellor_checkout_pending_handled";

export const markCheckoutPending = (info: { packageName?: string; billing?: string } = {}) => {
  try {
    sessionStorage.setItem(
      CHECKOUT_PENDING_KEY,
      JSON.stringify({ ...info, startedAt: Date.now() })
    );
    sessionStorage.removeItem(CHECKOUT_PENDING_HANDLED_KEY);
  } catch { /* ignore */ }
};

export const consumeCheckoutPending = (): { packageName?: string; billing?: string; startedAt: number } | null => {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_PENDING_KEY);
    if (!raw) return null;
    if (sessionStorage.getItem(CHECKOUT_PENDING_HANDLED_KEY)) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

export const clearCheckoutPending = () => {
  sessionStorage.removeItem(CHECKOUT_PENDING_KEY);
  sessionStorage.setItem(CHECKOUT_PENDING_HANDLED_KEY, "1");
};

let lastScrollRecordAt = 0;

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
  maxScrollPercent: getMaxScrollPercent(),
  startedAt: new Date().toISOString(),
});

const getMaxScrollPercent = () => Number(sessionStorage.getItem("pixcellor_max_scroll_percent") || "0");

export const recordScrollDepth = (scrollPercent: number) => {
  if (!hasFalloffConsent()) return;
  const safePercent = Math.max(0, Math.min(100, Math.round(scrollPercent)));
  const currentMax = getMaxScrollPercent();
  if (safePercent <= currentMax) return;

  sessionStorage.setItem("pixcellor_max_scroll_percent", String(safePercent));
  if (safePercent < 25 && Date.now() - lastScrollRecordAt < 5000) return;
  lastScrollRecordAt = Date.now();
  void recordFalloff({ event: "scroll_depth", maxScrollPercent: safePercent });
};

export const recordFalloff = async (metadata: Record<string, unknown> = {}) => {
  if (!hasFalloffConsent()) return;

  const context = getCheckoutContext();
  void supabase.functions.invoke("enrich-visitor", {
    body: { visitorId: context.clientId, sessionId: context.sessionId, context, metadata },
  });
};

export const recordVisitFalloffOnce = async () => {
  if (sessionStorage.getItem(VISIT_RECORDED_KEY)) return;
  sessionStorage.setItem(VISIT_RECORDED_KEY, "true");
  await recordFalloff({ event: "page_visit", visited_at: new Date().toISOString() });
};