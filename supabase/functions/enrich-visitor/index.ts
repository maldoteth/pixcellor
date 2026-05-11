import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Defence-in-depth schema. Caps are deliberately generous so any payload that
// previously worked still works — we just reject obvious abuse (megabyte
// strings, wrong types).
const BodySchema = z.object({
  visitorId: z.string().min(8).max(200),
  sessionId: z.string().min(8).max(200),
  context: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
}).passthrough();

const clean = (value: unknown) => typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null;
const cleanLong = (value: unknown) => typeof value === "string" && value.trim() ? value.trim().slice(0, 2000) : null;
const cleanInt = (value: unknown, min = 0, max = 100) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : null;
};

const getClientIp = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let raw: unknown;
    try { raw = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid_input", fields: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { visitorId, sessionId, context, metadata } = parsed.data;
    void visitorId; void sessionId; // already validated above

    if (typeof visitorId !== "string" || visitorId.length < 8 || visitorId.length > 200) throw new Error("Invalid visitorId");
    if (typeof sessionId !== "string" || sessionId.length < 8 || sessionId.length > 200) throw new Error("Invalid sessionId");
    const safeContext = context && typeof context === "object" ? context as Record<string, unknown> : {};
    const safeMetadata = metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {};
    const event = clean(safeMetadata.event);
    const maxScrollPercent = cleanInt(safeMetadata.maxScrollPercent ?? safeContext.maxScrollPercent);
    const portfolioPage = cleanInt(safeMetadata.portfolioPage, 0, 1000);
    const portfolioProject = clean(safeMetadata.projectName ?? safeMetadata.projectUrl);

    const token = Deno.env.get("IPINFO_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!token) throw new Error("IPINFO_TOKEN not configured");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    const ip = getClientIp(req);
    if (!ip) throw new Error("Could not detect visitor IP");

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: existingFalloff } = await supabase
      .from("visitor_falloffs")
      .select("max_scroll_percent, portfolio_opened_at, portfolio_pages_viewed, portfolio_project_opened_at, portfolio_project_opened, pricing_opened_at, buy_clicked_at")
      .eq("visitor_id", visitorId)
      .eq("session_id", sessionId)
      .maybeSingle();
    const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}?token=${encodeURIComponent(token)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(`IPinfo lookup failed [${response.status}]: ${JSON.stringify(data).slice(0, 300)}`);

    const company = data.company && typeof data.company === "object" ? data.company : {};
    const asn = data.asn && typeof data.asn === "object" ? data.asn : {};
    const privacy = data.privacy && typeof data.privacy === "object" ? data.privacy : {};
    const carrier = data.carrier && typeof data.carrier === "object" ? data.carrier : {};

    const { error } = await supabase
      .from("visitor_falloffs")
      .upsert({
        visitor_id: visitorId,
        session_id: sessionId,
        consent_status: "granted",
        first_page: cleanLong(safeContext.pageUrl),
        last_page: cleanLong(safeContext.pageUrl),
        referrer: cleanLong(safeContext.referrer),
        user_agent: cleanLong(safeContext.userAgent),
        browser_language: clean(safeContext.language),
        timezone: clean(safeContext.timezone),
        screen_size: clean(safeContext.screen),
        viewport_size: clean(safeContext.viewport),
        max_scroll_percent: Math.max(existingFalloff?.max_scroll_percent ?? 0, maxScrollPercent ?? 0),
        portfolio_opened_at: existingFalloff?.portfolio_opened_at ?? (event === "portfolio_opened" || event === "portfolio_page_viewed" || event === "portfolio_project_opened" ? new Date().toISOString() : null),
        portfolio_pages_viewed: Math.max(existingFalloff?.portfolio_pages_viewed ?? 0, portfolioPage ?? 0),
        portfolio_project_opened_at: existingFalloff?.portfolio_project_opened_at ?? (event === "portfolio_project_opened" ? new Date().toISOString() : null),
        portfolio_project_opened: event === "portfolio_project_opened" ? portfolioProject : existingFalloff?.portfolio_project_opened ?? null,
        pricing_opened_at: existingFalloff?.pricing_opened_at ?? (event === "pricing_opened" ? new Date().toISOString() : null),
        buy_clicked_at: existingFalloff?.buy_clicked_at ?? (event === "checkout_started" || event === "chat_checkout_started" ? new Date().toISOString() : null),
        last_seen_at: new Date().toISOString(),
        metadata: safeMetadata,
        ip_address: clean(data.ip) ?? ip,
        ip_hostname: clean(data.hostname),
        ip_city: clean(data.city),
        ip_region: clean(data.region),
        ip_country: clean(data.country),
        ip_location: clean(data.loc),
        ip_postal: clean(data.postal),
        ip_timezone: clean(data.timezone),
        company_name: clean(company.name) ?? clean(data.org),
        company_domain: clean(company.domain),
        company_type: clean(company.type),
        asn: clean(asn.asn),
        as_name: clean(asn.name) ?? clean(data.org),
        as_domain: clean(asn.domain),
        as_route: clean(asn.route),
        carrier_name: clean(carrier.name),
        carrier_mcc: clean(carrier.mcc),
        carrier_mnc: clean(carrier.mnc),
        privacy_vpn: typeof privacy.vpn === "boolean" ? privacy.vpn : null,
        privacy_proxy: typeof privacy.proxy === "boolean" ? privacy.proxy : null,
        privacy_tor: typeof privacy.tor === "boolean" ? privacy.tor : null,
        privacy_relay: typeof privacy.relay === "boolean" ? privacy.relay : null,
        privacy_hosting: typeof privacy.hosting === "boolean" ? privacy.hosting : null,
        enrichment_source: "ipinfo",
        enrichment_status: "enriched",
        enrichment_error: null,
        enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "visitor_id,session_id", ignoreDuplicates: false });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});