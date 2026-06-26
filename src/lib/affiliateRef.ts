// Affiliate referral cookie attribution.
//
// First-touch wins: once a visitor lands with `?ref=CODE`, we set a cookie
// for 90 days and never overwrite it on subsequent visits. This means a
// referrer still gets credit even if the buyer returns later and pays
// without re-using the link (or even without applying the discount code at
// checkout). The webhook will fall back to this stamped value when no
// Stripe promotion code was attached.

const COOKIE_NAME = "pix_aff_ref";
const COOKIE_DAYS = 90;
const VALID = /^[A-Za-z0-9_-]{3,40}$/;

const setCookie = (value: string) => {
  try {
    const expires = new Date(Date.now() + COOKIE_DAYS * 86400_000).toUTCString();
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
  } catch { /* ignore */ }
};

const readCookie = (): string | null => {
  try {
    const match = document.cookie.split("; ").find((row) => row.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    const val = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
    return VALID.test(val) ? val : null;
  } catch { return null; }
};

export const getAffiliateRef = (): string | null => readCookie();

export const captureAffiliateRefFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ref") || params.get("aff");
    if (!raw) return;
    const code = raw.trim().toUpperCase();
    if (!VALID.test(code)) return;
    // First-touch wins: don't overwrite an existing referral cookie.
    if (readCookie()) return;
    setCookie(code);
  } catch { /* ignore */ }
};
