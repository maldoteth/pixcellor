const CLIENT_ID_KEY = "pixcellor_checkout_client_id";

const getCheckoutClientId = () => {
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;

  const id = `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem(CLIENT_ID_KEY, id);
  return id;
};

export const getCheckoutContext = () => ({
  clientId: getCheckoutClientId(),
  pageUrl: window.location.href,
  referrer: document.referrer || null,
  userAgent: navigator.userAgent,
  language: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  screen: `${window.screen.width}x${window.screen.height}`,
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  startedAt: new Date().toISOString(),
});