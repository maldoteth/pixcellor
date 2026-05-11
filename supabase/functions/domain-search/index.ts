import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const BodySchema = z.object({
  mode: z.string().max(20).optional(),
  query: z.string().max(300).optional(),
}).passthrough();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PORKBUN_BASE = "https://api.porkbun.com/api/json/v3";
// TLDs we surface as suggestions. .com is always the primary check.
const SUGGEST_TLDS = [
  "com", "co", "io", "xyz", "site", "online", "shop", "studio", "app", "co.uk",
  "net", "org", "dev", "ai", "me", "tech", "store", "design", "agency", "digital",
  "uk", "biz", "info", "world", "pro",
];
// Conservative USD->GBP. Slightly inflated to avoid loss when rates drift.
const USD_TO_GBP = 0.82;
// Markup applied to the registrar cost so currency drift / Porkbun price changes
// don't eat into margin. 15% with a small £2 floor (covers card fees on cheap TLDs),
// rounded up to nearest £0.50.
const MARKUP_MULTIPLIER = 1.15;
const PRICE_FLOOR_GBP = 2;

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

function priceToBadges(priceUsd: number) {
  const costGbp = priceUsd * USD_TO_GBP;
  const withMarkup = costGbp * MARKUP_MULTIPLIER;
  // Round UP to next £0.50 then apply floor.
  const rounded = Math.ceil(withMarkup * 2) / 2;
  const customerPriceGbp = Math.max(PRICE_FLOOR_GBP, rounded);
  // `priceGbp` and `topUpGbp` both expose the customer-facing price now;
  // legacy field names are kept so DB/webhook/order pages don't need refactoring.
  return { priceGbp: customerPriceGbp, topUpGbp: customerPriceGbp, freeWithPackage: false };
}

function parseMoney(v: unknown): number {
  if (v == null) return NaN;
  const s = String(v).replace(/[, ]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

async function findMarketplaceExact(domain: string, label: string, tld: string, apikey: string, secret: string) {
  const res = await fetch(`${PORKBUN_BASE}/marketplace/getAll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey,
      secretapikey: secret,
      query: `+${label}`,
      tlds: [tld],
      sldLengthMin: label.length,
      sldLengthMax: label.length,
      sortName: "price",
      sortDirection: "asc",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.status === "ERROR") return NaN;
  const listing = Array.isArray(json?.domains)
    ? json.domains.find((d: any) => String(d?.domain ?? "").toLowerCase() === domain)
    : null;
  return parseMoney(listing?.price);
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
  const isPremium = String(r.premium ?? "").toLowerCase() === "yes";
  const availRaw = String(r.avail ?? "").toLowerCase() === "yes";
  // Premium domains are reported as avail=no by Porkbun but ARE purchasable
  // at the premium price. Treat them as available when a real price is returned.
  const priceUsd = parseMoney(r.price);
  const regularPriceUsd = parseMoney(r.regularPrice);
  const available = availRaw || (isPremium && Number.isFinite(priceUsd));
  return {
    ok: true,
    available,
    isPremium,
    priceUsd,
    regularPriceUsd,
    firstYearPromo: String(r.firstYearPromo ?? "").toLowerCase() === "yes",
  };
}

async function getCheckedDomain(domain: string, label: string, tld: string, apikey: string, secret: string) {
  const cached = checkCache.get(domain);
  if (cached && Date.now() - cached.at < 60_000) return cached.payload;

  const check = await checkOneDomain(domain, apikey, secret);
  let payload: any;
  if (!check.ok) {
    payload = {
      domain,
      available: null,
      priceGbp: null,
      topUpGbp: 0,
      freeWithPackage: false,
      rateLimited: check.rateLimited,
      error: check.message || check.code,
    };
    return payload;
  } else {
    const marketplacePriceUsd = await findMarketplaceExact(domain, label, tld, apikey, secret);
    const exactPriceUsd = Number.isFinite(marketplacePriceUsd) ? marketplacePriceUsd : (Number.isFinite(check.priceUsd) ? check.priceUsd : NaN);
    const regularPriceUsd = Number.isFinite(check.regularPriceUsd) ? check.regularPriceUsd : NaN;
    // Premium domains can expose a lower `price` plus a much higher
    // `regularPrice`; use the higher number so names like brand.xyz never
    // underquote against Porkbun's displayed premium cost.
    const priceUsd = check.isPremium
      ? Math.max(Number.isFinite(exactPriceUsd) ? exactPriceUsd : 0, Number.isFinite(regularPriceUsd) ? regularPriceUsd : 0)
      : exactPriceUsd;
    const badges = Number.isFinite(priceUsd) ? priceToBadges(priceUsd) : { priceGbp: null, topUpGbp: 0, freeWithPackage: false };
    payload = {
      domain,
      available: check.available,
      isPremium: check.isPremium,
      ...badges,
      firstYearPromo: check.firstYearPromo,
    };
  }
  checkCache.set(domain, { at: Date.now(), payload });
  return payload;
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

    const rawBody = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = parsed.data;
    const mode = body?.mode === "verify" ? "verify" : "search";
    const { label, tld } = sanitizeLabel(typeof body?.query === "string" ? body.query : "");
    if (!label || label.length < 2) {
      return new Response(JSON.stringify({ primary: null, suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const targetTld = tld ?? "com";
    const targetDomain = `${label}.${targetTld}`;

    const primary = await getCheckedDomain(targetDomain, label, targetTld, apikey, secret);

    // Verify mode: just return the exact-checked primary, no suggestions.
    if (mode === "verify") {
      return new Response(JSON.stringify({ primary, suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check all suggestion TLDs in parallel against Porkbun and only surface
    // ones that are actually available with a real price. Premium domains are
    // included with their real (often expensive) price.
    const candidateTlds = SUGGEST_TLDS.filter((t) => t !== targetTld);
    const checked = await Promise.all(
      candidateTlds.map(async (t) => {
        try {
          const d = `${label}.${t}`;
          const c: any = await getCheckedDomain(d, label, t, apikey, secret);
          return { ...c, tld: t };
        } catch {
          return null;
        }
      }),
    );
    const suggestions = checked
      .filter((c: any) => c && c.available === true && c.priceGbp != null)
      .sort((a: any, b: any) => (a.priceGbp ?? 0) - (b.priceGbp ?? 0))
      .map((c: any) => ({
        domain: c.domain,
        tld: c.tld,
        available: true,
        isPremium: !!c.isPremium,
        priceGbp: c.priceGbp,
        topUpGbp: c.topUpGbp,
        freeWithPackage: !!c.freeWithPackage,
        estimated: false,
      }));

    return new Response(JSON.stringify({ primary, suggestions }), {
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
