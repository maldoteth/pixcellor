import { supabase } from "@/integrations/supabase/client";
import { extractEmailFromCookieString, type VisitorEmailIdentity } from "@/lib/visitorIdentity";

const CLIENT_ID_KEY = "pixcellor_checkout_client_id";
const SESSION_ID_KEY = "pixcellor_checkout_session_id";
const VISIT_RECORDED_KEY = "pixcellor_visit_falloff_recorded";
export const FALL_OFF_CONSENT_KEY = "pixcellor_falloff_consent";
const CHECKOUT_PENDING_KEY = "pixcellor_checkout_pending";
const CHECKOUT_PENDING_HANDLED_KEY = "pixcellor_checkout_pending_handled";
const SESSION_STARTED_AT_KEY = "pixcellor_session_started_at";
const SESSION_ACTIVE_MS_KEY = "pixcellor_session_active_ms";
const SESSION_PAGE_VIEWS_KEY = "pixcellor_session_page_views";
const SESSION_LAST_PATH_KEY = "pixcellor_session_last_path";
const SESSION_VISIBILITY_CHANGES_KEY = "pixcellor_session_visibility_changes";
const SESSION_ATTRIBUTION_KEY = "pixcellor_session_attribution";
const CONSENT_CHANGED_EVENT = "pixcellor:falloff-consent-changed";
const HEARTBEAT_INTERVAL_MS = 30_000;
const NON_VISITOR_PATH_PREFIXES = [
  "/admin",
  "/portal",
  "/portal-login",
  "/customer-login",
  "/customer-portal",
  "/reset-password",
  "/auth/",
  "/invoice/",
  "/invoices-admin",
  "/me",
  "/candidate-portal",
  "/jobs/apply",
  "/call/",
  "/meeting/",
  "/byow/edit/",
  "/s/",
  "/project-requirements",
  "/edit-request",
  "/unsubscribe",
  "/vacancy/respond",
];

type TrackingAttribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
};

type RecordFalloffOptions = {
  force?: boolean;
  dedupeKey?: string;
};

export const markCheckoutPending = (info: { packageName?: string; billing?: string; sessionId?: string } = {}) => {
  try {
    sessionStorage.setItem(
      CHECKOUT_PENDING_KEY,
      JSON.stringify({ ...info, startedAt: Date.now() }),
    );
    sessionStorage.removeItem(CHECKOUT_PENDING_HANDLED_KEY);
  } catch { /* ignore */ }
};

export const updateCheckoutPendingSessionId = (sessionId: string) => {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_PENDING_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    sessionStorage.setItem(CHECKOUT_PENDING_KEY, JSON.stringify({ ...parsed, sessionId }));
  } catch { /* ignore */ }
};

export const consumeCheckoutPending = (): { packageName?: string; billing?: string; sessionId?: string; startedAt: number } | null => {
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
let lastFalloffCallAt = 0;
const lastEventCallAt = new Map<string, number>();
const SCROLL_MILESTONES = [25, 50, 75, 100];
const recordedScrollMilestones = new Set<number>();
let activeStartedAt: number | null = null;
let sessionTrackingCleanup: (() => void) | null = null;
let knownEmailIdentity: VisitorEmailIdentity | null = null;

const readSessionNumber = (key: string, fallback = 0) => {
  const value = Number(sessionStorage.getItem(key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const writeSessionNumber = (key: string, value: number) => {
  sessionStorage.setItem(key, String(Math.max(0, Math.round(value))));
};

const getSessionStartedAt = () => {
  const existing = readSessionNumber(SESSION_STARTED_AT_KEY);
  if (existing > 0) return existing;
  const startedAt = Date.now();
  writeSessionNumber(SESSION_STARTED_AT_KEY, startedAt);
  return startedAt;
};

const persistActiveTime = () => {
  if (activeStartedAt === null) return readSessionNumber(SESSION_ACTIVE_MS_KEY);
  const total = readSessionNumber(SESSION_ACTIVE_MS_KEY) + Math.max(0, Date.now() - activeStartedAt);
  writeSessionNumber(SESSION_ACTIVE_MS_KEY, total);
  activeStartedAt = Date.now();
  return total;
};

const safePageUrl = (value: string) => {
  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return window.location.origin + window.location.pathname;
  }
};

const safeReferrer = () => {
  if (!document.referrer) return null;
  try {
    const url = new URL(document.referrer);
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
};

const getAttribution = (): TrackingAttribution => {
  const existing = sessionStorage.getItem(SESSION_ATTRIBUTION_KEY);
  if (existing) {
    try { return JSON.parse(existing) as TrackingAttribution; } catch { /* recapture below */ }
  }

  const params = new URLSearchParams(window.location.search);
  const attribution: TrackingAttribution = {
    utmSource: params.get("utm_source")?.slice(0, 200) ?? null,
    utmMedium: params.get("utm_medium")?.slice(0, 200) ?? null,
    utmCampaign: params.get("utm_campaign")?.slice(0, 200) ?? null,
    utmTerm: params.get("utm_term")?.slice(0, 200) ?? null,
    utmContent: params.get("utm_content")?.slice(0, 200) ?? null,
  };
  sessionStorage.setItem(SESSION_ATTRIBUTION_KEY, JSON.stringify(attribution));
  return attribution;
};

const getConnectionType = () => {
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return connection?.effectiveType?.slice(0, 40) ?? null;
};

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

const refreshKnownEmailIdentity = async () => {
  const cookieIdentity = extractEmailFromCookieString(document.cookie);
  if (cookieIdentity) knownEmailIdentity = cookieIdentity;

  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email?.trim().toLowerCase();
  if (email && email.length <= 320) {
    knownEmailIdentity = { email, source: "authenticated_session" };
  }
};

export const hasFalloffConsent = () => localStorage.getItem(FALL_OFF_CONSENT_KEY) === "granted";

export const isFalloffTrackablePath = (path = window.location.pathname) =>
  !NON_VISITOR_PATH_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? path.startsWith(prefix) : path === prefix || path.startsWith(`${prefix}/`),
  );

export const setFalloffConsent = (granted: boolean) => {
  localStorage.setItem(FALL_OFF_CONSENT_KEY, granted ? "granted" : "declined");
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: { granted } }));
};

const getMaxScrollPercent = () => Number(sessionStorage.getItem("pixcellor_max_scroll_percent") || "0");

export const getCheckoutContext = () => {
  const now = Date.now();
  const startedAt = getSessionStartedAt();
  const activeMs = persistActiveTime();
  const cookieIdentity = extractEmailFromCookieString(document.cookie);
  const identity = knownEmailIdentity ?? cookieIdentity;

  return {
    clientId: getCheckoutClientId(),
    sessionId: getSessionId(),
    pageUrl: safePageUrl(window.location.href),
    pagePath: window.location.pathname.slice(0, 1000),
    referrer: safeReferrer(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    maxScrollPercent: getMaxScrollPercent(),
    sessionStartedAt: new Date(startedAt).toISOString(),
    capturedAt: new Date(now).toISOString(),
    sessionDurationSeconds: Math.max(0, Math.round((now - startedAt) / 1000)),
    activeDurationSeconds: Math.max(0, Math.round(activeMs / 1000)),
    pageViewCount: readSessionNumber(SESSION_PAGE_VIEWS_KEY),
    visibilityChangeCount: readSessionNumber(SESSION_VISIBILITY_CHANGES_KEY),
    identifiedEmail: identity?.email ?? null,
    identifiedEmailSource: identity?.source ?? null,
    platform: navigator.platform?.slice(0, 200) || null,
    connectionType: getConnectionType(),
    touchPoints: navigator.maxTouchPoints ?? 0,
    ...getAttribution(),
    // Kept for checkout compatibility; now represents the actual session start.
    startedAt: new Date(startedAt).toISOString(),
  };
};

export const recordScrollDepth = (scrollPercent: number) => {
  if (!hasFalloffConsent()) return;
  const safePercent = Math.max(0, Math.min(100, Math.round(scrollPercent)));
  const currentMax = getMaxScrollPercent();
  if (safePercent <= currentMax) return;

  sessionStorage.setItem("pixcellor_max_scroll_percent", String(safePercent));

  // Only fire on milestone crossings (25/50/75/100), not every scroll tick.
  const milestone = SCROLL_MILESTONES.find((value) => safePercent >= value && currentMax < value);
  if (milestone === undefined || recordedScrollMilestones.has(milestone)) return;
  recordedScrollMilestones.add(milestone);

  if (Date.now() - lastScrollRecordAt < 5000) return;
  lastScrollRecordAt = Date.now();
  void recordFalloff({ event: "scroll_depth", maxScrollPercent: safePercent });
};

export const recordFalloff = async (metadata: Record<string, unknown> = {}, options: RecordFalloffOptions = {}) => {
  if (!hasFalloffConsent() || !isFalloffTrackablePath()) return;

  const now = Date.now();
  if (!options.force && now - lastFalloffCallAt < 2000) return;

  const eventName = typeof metadata.event === "string" ? metadata.event : "_anon";
  const eventKey = options.dedupeKey ? `${eventName}:${options.dedupeKey}` : eventName;
  const lastSame = lastEventCallAt.get(eventKey) ?? 0;
  if (!options.force && now - lastSame < 30000) return;
  lastFalloffCallAt = now;
  lastEventCallAt.set(eventKey, now);

  const context = getCheckoutContext();
  await supabase.functions.invoke("enrich-visitor", {
    body: { visitorId: context.clientId, sessionId: context.sessionId, context, metadata },
  });
};

export const recordVisitFalloffOnce = async () => {
  if (sessionStorage.getItem(VISIT_RECORDED_KEY)) return;
  sessionStorage.setItem(VISIT_RECORDED_KEY, "true");
  await recordFalloff({ event: "page_visit", visited_at: new Date().toISOString() });
};

export const recordTrackedPageView = async () => {
  if (!hasFalloffConsent() || !isFalloffTrackablePath()) return;

  const path = window.location.pathname.slice(0, 1000);
  const previousPath = sessionStorage.getItem(SESSION_LAST_PATH_KEY);
  if (previousPath === path) return;

  sessionStorage.setItem(SESSION_LAST_PATH_KEY, path);
  const pageViewCount = readSessionNumber(SESSION_PAGE_VIEWS_KEY) + 1;
  writeSessionNumber(SESSION_PAGE_VIEWS_KEY, pageViewCount);
  await recordFalloff(
    { event: "page_view", pagePath: path, pageViewCount },
    { dedupeKey: path },
  );
};

const beginConsentedSessionTracking = () => {
  if (!hasFalloffConsent() || sessionTrackingCleanup) return;

  getSessionStartedAt();
  if (document.visibilityState === "visible" && activeStartedAt === null) activeStartedAt = Date.now();
  void recordTrackedPageView();
  void refreshKnownEmailIdentity().then(() => {
    window.setTimeout(() => void recordFalloff({ event: "identity_refresh" }), 2100);
  });

  const heartbeat = window.setInterval(() => {
    void recordFalloff({ event: "session_heartbeat" });
  }, HEARTBEAT_INTERVAL_MS);

  const onVisibilityChange = () => {
    const changes = readSessionNumber(SESSION_VISIBILITY_CHANGES_KEY) + 1;
    writeSessionNumber(SESSION_VISIBILITY_CHANGES_KEY, changes);
    if (document.visibilityState === "visible") {
      activeStartedAt = Date.now();
    } else {
      persistActiveTime();
      activeStartedAt = null;
      void recordFalloff({ event: "session_backgrounded" }, { force: true });
    }
  };

  const onPageHide = () => {
    persistActiveTime();
    activeStartedAt = null;
    void recordFalloff({ event: "session_end", endedAt: new Date().toISOString() }, { force: true });
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  sessionTrackingCleanup = () => {
    window.clearInterval(heartbeat);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    activeStartedAt = null;
    sessionTrackingCleanup = null;
  };
};

export const startFalloffSessionTracking = () => {
  const onConsentChanged = (event: Event) => {
    const granted = (event as CustomEvent<{ granted?: boolean }>).detail?.granted === true;
    if (granted) beginConsentedSessionTracking();
    else sessionTrackingCleanup?.();
  };

  window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
  beginConsentedSessionTracking();

  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    sessionTrackingCleanup?.();
  };
};
