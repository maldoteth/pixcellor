export type VisitorEmailIdentity = {
  email: string;
  source: string;
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_FIELD_PATTERN = /^(?:email|user_email|customer_email|contact_email)$/i;
const SENSITIVE_COOKIE_NAME_PATTERN = /(?:auth|session|token|jwt|csrf|secret|nonce|password)/i;

const normaliseEmail = (value: unknown) => {
  if (typeof value !== "string") return null;
  const email = value.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
  return email.length <= 320 && EMAIL_PATTERN.test(email) ? email : null;
};

const decodeCookieValue = (value: string) => {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
};

const findEmailField = (value: unknown, depth = 0): string | null => {
  if (!value || typeof value !== "object" || depth > 3) return null;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (EMAIL_FIELD_PATTERN.test(key)) {
      const email = normaliseEmail(child);
      if (email) return email;
    }
    const nested = findEmailField(child, depth + 1);
    if (nested) return nested;
  }

  return null;
};

/**
 * Reads only a validated email from first-party, JavaScript-readable cookies.
 * Cookie values, auth cookies, tokens, and cookie inventories are never returned.
 */
export const extractEmailFromCookieString = (cookieString: string): VisitorEmailIdentity | null => {
  for (const part of cookieString.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;

    const name = part.slice(0, separator).trim();
    if (!name || SENSITIVE_COOKIE_NAME_PATTERN.test(name)) continue;

    const decoded = decodeCookieValue(part.slice(separator + 1).trim());
    if (EMAIL_FIELD_PATTERN.test(name)) {
      const email = normaliseEmail(decoded);
      if (email) return { email, source: `cookie:${name.slice(0, 80)}` };
    }

    if (!decoded.startsWith("{") && !decoded.startsWith("[")) continue;
    try {
      const email = findEmailField(JSON.parse(decoded));
      if (email) return { email, source: `cookie:${name.slice(0, 80)}` };
    } catch {
      // Non-JSON cookies are intentionally ignored.
    }
  }

  return null;
};
