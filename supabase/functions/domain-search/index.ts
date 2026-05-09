import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PORKBUN_BASE = "https://api.porkbun.com/api/json/v3";
// TLDs we surface as suggestions. .com is always the primary check.
const SUGGEST_TLDS = ["com", "co", "io", "xyz", "site", "online", "shop", "studio", "app", "co.uk"];
const ALLOWANCE_GBP = 10;
// Conservative USD->GBP. Slightly inflated to avoid loss when rates drift.
const USD_TO_GBP = 0.82;

let pricingCache: { at: number; data: Record<string, { registration: number; renewal: number }> } | null = null;
const checkCache = new Map<string, { at: number; payload: unknown }>();
const ipHits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (ipHits.get(ip) ?? []).filter((t) => now - t < 10_000);
  arr.push(now);
  ipHits.set(ip, arr);
  return arr.length > 10;
}

function sanitizeLabel(raw: string): { label: string; tld: string | null } {
  let s = raw.toLowerCase().trim();
  s = s.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  s = s.replace(/[^a-z0-9.-]/g, "");
  if (!s) return { label: "", tld: null };
  // Detect TLD if user typed one — check for known multi-part TLDs first.
  const multiTlds = ["co.uk", "com.au", "co.nz"];
  for (const t of multiTlds) {
    if (s.endsWith("." + t)) {
      const label = s.slice(0, -1 - t.length);
      return { label: label.slice(0, 63), tld: t };
    }
  }
  const dot = s.lastIndexOf(".");
  if (dot > 0) {
    return { label: s.slice(0, dot).slice(0, 63), tld: s.slice(dot + 1) };
  }
  return { label: s.slice(0, 63), tld: null };
}

async function loadPricing(): Promise<Record<string, { registration: number; renewal: number }>> {
  if (pricingCache && Date.now() - pricingCache.at < 24 * 60 * 60 * 1000) return pricingCache.data;
  const res = await fetch(`${PORKBUN_BASE}/pricing/get`);
  const json = await res.json().catch(() => ({}));
  const pricing = (json?.pricing ?? {}) as Record<string, { registration: string; renewal: string }>;
  const out: Record<string, { registration: number; renewal: number }> = {};
  for (const [tld, p] of Object.entries(pricing)) {
    const reg = Number(p.registration);
    const ren = Number(p.renewal);
    if (Number.isFinite(reg)) out[tld] = { registration: reg, renewal: Number.isFinite(ren) ? ren : reg };
  }
  pricingCache = { at: Date.now(), data: out };
  return out;
}

function priceToBadges(priceUsd: number) {
  const priceGbp = Math.round(priceUsd * USD_TO_GBP * 100) / 100;
  const topUpGbp = Math.max(0, Math.ceil(priceGbp - ALLOWANCE_GBP));
  return { priceGbp, topUpGbp, freeWithPackage: topUpGbp === 0 };
}

async function checkOneDomain(domain: string, apikey: string, secret: string) {
  const res = await fetch(`${PORKBUN_BASE}/domain/checkDomain/${domain}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey, secretapikey: secret }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.status === "ERROR") {
    const code = json?.code ?? "ERROR";
    return { ok: false, rateLimited: code === "RATE_LIMIT_EXCEEDED", code, message: json?.message ?? "" };
  }
  const r = json?.response ?? {};
  return {
    ok: true,
    available: String(r.avail ?? "").toLowerCase() === "yes",
    isPremium: String(r.premium ?? "").toLowerCase() === "yes",
    priceUsd: Number(r.price ?? NaN),
    regularPriceUsd: Number(r.regularPrice ?? NaN),
    firstYearPromo: String(r.firstYearPromo ?? "").toLowerCase() === "yes",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apikey = Deno.env.get("PORKBUN_API_KEY");
    const secret = Deno.env.get("PORKBUN_SECRET_API_KEY");
    if (!apikey || !secret) throw new Error("Porkbun credentials not configured");

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Slow down — try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { label, tld } = sanitizeLabel(typeof body?.query === "string" ? body.query : "");
    if (!label || label.length < 2) {
      return new Response(JSON.stringify({ primary: null, suggestions: [], allowanceGbp: ALLOWANCE_GBP }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const targetTld = tld ?? "com";
    const targetDomain = `${label}.${targetTld}`;

    // Cached availability for 60s.
    const cacheKey = targetDomain;
    const cached = checkCache.get(cacheKey);
    let primary: any;
    if (cached && Date.now() - cached.at < 60_000) {
      primary = cached.payload;
    } else {
      const check = await checkOneDomain(targetDomain, apikey, secret);
      if (!check.ok) {
        primary = {
          domain: targetDomain,
          available: null,
          rateLimited: check.rateLimited,
          error: check.message || check.code,
        };
      } else {
        const priceUsd = Number.isFinite(check.priceUsd) ? check.priceUsd : check.regularPriceUsd;
        const badges = Number.isFinite(priceUsd) ? priceToBadges(priceUsd) : { priceGbp: null, topUpGbp: 0, freeWithPackage: false };
        primary = {
          domain: targetDomain,
          available: check.available,
          isPremium: check.isPremium,
          ...badges,
          firstYearPromo: check.firstYearPromo,
        };
      }
      checkCache.set(cacheKey, { at: Date.now(), payload: primary });
    }

    // Build suggestions from cached pricing — NO availability check (rate limit).
    // The buyer can click one to verify it specifically.
    const pricing = await loadPricing();
    const suggestions = SUGGEST_TLDS
      .filter((t) => t !== targetTld)
      .map((t) => {
        const p = pricing[t];
        if (!p) return null;
        const badges = priceToBadges(p.registration);
        const renewalGbp = Math.round(p.renewal * USD_TO_GBP * 100) / 100;
        return {
          domain: `${label}.${t}`,
          tld: t,
          ...badges,
          renewalGbp,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        if (a.freeWithPackage !== b.freeWithPackage) return a.freeWithPackage ? -1 : 1;
        return (a.priceGbp ?? 9999) - (b.priceGbp ?? 9999);
      });

    return new Response(JSON.stringify({ primary, suggestions, allowanceGbp: ALLOWANCE_GBP }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Domain search failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
