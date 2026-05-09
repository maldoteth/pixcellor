import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PORKBUN_BASE = "https://api.porkbun.com/api/json/v3";
const TLDS = ["com", "co", "io", "xyz", "site", "online", "shop", "studio", "app", "co.uk"];
const ALLOWANCE_GBP = 10;
// Conservative USD->GBP. Slightly inflated to avoid loss when rates drift.
const USD_TO_GBP = 0.82;

const cache = new Map<string, { at: number; payload: unknown }>();
const ipHits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10_000;
  const max = 10;
  const arr = (ipHits.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  ipHits.set(ip, arr);
  return arr.length > max;
}

function sanitizeQuery(raw: string): string {
  // Strip protocol/path, lowercase, allow only a-z 0-9 - .
  let s = raw.toLowerCase().trim();
  s = s.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  s = s.replace(/[^a-z0-9.-]/g, "");
  // If user typed a full domain like "foo.com", strip the TLD — we'll spread across our own TLD list.
  const dotIdx = s.indexOf(".");
  if (dotIdx > 0) s = s.slice(0, dotIdx);
  return s.slice(0, 63);
}

type CheckResult = {
  domain: string;
  available: boolean;
  isPremium: boolean;
  priceGbp: number | null;
  topUpGbp: number;
  freeWithPackage: boolean;
};

async function checkDomain(domain: string, apikey: string, secret: string): Promise<CheckResult> {
  const res = await fetch(`${PORKBUN_BASE}/domain/checkDomain/${domain}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey, secretapikey: secret }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.status === "ERROR") {
    return { domain, available: false, isPremium: false, priceGbp: null, topUpGbp: 0, freeWithPackage: false };
  }
  const r = json?.response ?? {};
  const available = String(r.avail ?? "").toLowerCase() === "yes";
  const isPremium = String(r.premium ?? "").toLowerCase() === "yes";
  const priceUsd = Number(r.firstYearPromo ?? r.price ?? NaN);
  const priceGbp = Number.isFinite(priceUsd) ? Math.ceil(priceUsd * USD_TO_GBP * 100) / 100 : null;
  const topUpGbp = priceGbp == null ? 0 : Math.max(0, Math.ceil(priceGbp - ALLOWANCE_GBP));
  return {
    domain,
    available,
    isPremium,
    priceGbp,
    topUpGbp,
    freeWithPackage: available && !isPremium && topUpGbp === 0 && priceGbp != null,
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
      return new Response(JSON.stringify({ error: "Too many requests, slow down a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawQuery = typeof body?.query === "string" ? body.query : "";
    const query = sanitizeQuery(rawQuery);
    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const cacheKey = query;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < 60_000) {
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const candidates = TLDS.map((tld) => `${query}.${tld}`);
    const results = await Promise.all(candidates.map((d) => checkDomain(d, apikey, secret)));
    // Sort: free with package first, then cheapest top-up, then unavailable last.
    results.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      if (a.freeWithPackage !== b.freeWithPackage) return a.freeWithPackage ? -1 : 1;
      return (a.priceGbp ?? 9999) - (b.priceGbp ?? 9999);
    });

    const payload = { results, allowanceGbp: ALLOWANCE_GBP };
    cache.set(cacheKey, { at: Date.now(), payload });

    return new Response(JSON.stringify(payload), {
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
