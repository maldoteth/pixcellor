import { describe, expect, it } from "vitest";
import { extractEmailFromCookieString } from "@/lib/visitorIdentity";

describe("extractEmailFromCookieString", () => {
  it("extracts and normalises a direct email cookie", () => {
    expect(extractEmailFromCookieString("theme=dark; customer_email=Hello%40Example.com")).toEqual({
      email: "hello@example.com",
      source: "cookie:customer_email",
    });
  });

  it("extracts an email field from a JSON profile cookie", () => {
    const profile = encodeURIComponent(JSON.stringify({ profile: { email: "lead@example.com" } }));
    expect(extractEmailFromCookieString(`preferences=compact; profile=${profile}`)).toEqual({
      email: "lead@example.com",
      source: "cookie:profile",
    });
  });

  it("never inspects auth, session, or token cookies", () => {
    expect(extractEmailFromCookieString([
      "auth_token=user%40example.com",
      "session={\"email\":\"user@example.com\"}",
      "csrf_secret=user%40example.com",
    ].join("; "))).toBeNull();
  });

  it("does not return arbitrary cookie values or malformed emails", () => {
    expect(extractEmailFromCookieString("notes=contact%20me%20at%20lead%40example.com; email=not-an-email")).toBeNull();
  });
});
