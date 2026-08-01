import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  visitorId: z.string().min(8).max(200),
  sessionId: z.string().min(8).max(200),
  context: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
}).passthrough();

const clean = (value: unknown) => typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null;
const cleanLong = (value: unknown) => typeof value === "string" && value.trim() ? value.trim().slice(0, 2000) : null;
const cleanInt = (value: unknown, min = 0, max = 100) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : null;
};
const cleanEmail = (value: unknown) => {
  const email = clean(value)?.toLowerCase() ?? null;
  return email && email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};
const cleanTimestamp = (value: unknown) => {
  const timestamp = clean(value);
  if (!timestamp) return null;
  const parsed = new Date(timestamp);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

const getClientIp = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || null;
};

const getDeviceType = (userAgent: string | null) => {
  if (!userAgent) return null;
  if (/ipad|tablet|kindle|playbook|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return "desktop";
};

const getPageHistory = (existing: unknown, pagePath: string | null, event: string | null) => {
  const history = Array.isArray(existing)
    ? existing.filter((item): item is string => typeof item === "string" && item.length > 0).slice(-24)
    : [];
  if (pagePath && (event === "page_view" || history.length === 0) && history[history.length - 1] !== pagePath) history.push(pagePath);
  return history.slice(-25);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid_input", fields: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { visitorId, sessionId, context, metadata } = parsed.data;
    const safeContext = isRecord(context) ? context : {};
    const safeMetadata = isRecord(metadata) ? metadata : {};
    const event = clean(safeMetadata.event);
    const now = new Date().toISOString();
    const pageUrl = cleanLong(safeContext.pageUrl);
    const pagePath = cleanLong(safeContext.pagePath ?? safeMetadata.pagePath);
    const userAgent = cleanLong(safeContext.userAgent);
    const maxScrollPercent = cleanInt(safeMetadata.maxScrollPercent ?? safeContext.maxScrollPercent);
    const portfolioPage = cleanInt(safeMetadata.portfolioPage, 0, 1000);
    const portfolioProject = clean(safeMetadata.projectName ?? safeMetadata.projectUrl);
    const sessionDurationSeconds = cleanInt(safeContext.sessionDurationSeconds, 0, 604800);
    const activeDurationSeconds = cleanInt(safeContext.activeDurationSeconds, 0, 604800);
    const pageViewCount = cleanInt(safeContext.pageViewCount ?? safeMetadata.pageViewCount, 0, 10000);
    const visibilityChangeCount = cleanInt(safeContext.visibilityChangeCount, 0, 10000);
    const identifiedEmail = cleanEmail(safeContext.identifiedEmail);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: existingFalloff, error: existingError } = await supabase
      .from("visitor_falloffs")
      .select("first_page, max_scroll_percent, portfolio_opened_at, portfolio_pages_viewed, portfolio_project_opened_at, portfolio_project_opened, pricing_opened_at, buy_clicked_at, enrichment_status, enriched_at, metadata, event_count, session_started_at, session_ended_at, session_duration_seconds, active_duration_seconds, page_view_count, visibility_change_count, identified_email, identified_email_source, page_history, utm_source, utm_medium, utm_campaign, utm_term, utm_content")
      .eq("visitor_id", visitorId)
      .eq("session_id", sessionId)
      .maybeSingle();
    if (existingError) throw existingError;

    const existingMetadata = isRecord(existingFalloff?.metadata) ? existingFalloff.metadata : {};
    const pageHistory = getPageHistory(existingFalloff?.page_history, pagePath, event);
    const engagement = {
      last_seen_at: now,
      last_page: pageUrl,
      session_started_at: existingFalloff?.session_started_at ?? cleanTimestamp(safeContext.sessionStartedAt ?? safeContext.startedAt) ?? now,
      session_ended_at: event === "session_end"
        ? cleanTimestamp(safeMetadata.endedAt ?? safeContext.capturedAt) ?? now
        : existingFalloff?.session_ended_at ?? null,
      session_duration_seconds: Math.max(existingFalloff?.session_duration_seconds ?? 0, sessionDurationSeconds ?? 0),
      active_duration_seconds: Math.max(existingFalloff?.active_duration_seconds ?? 0, activeDurationSeconds ?? 0),
      page_view_count: Math.max(existingFalloff?.page_view_count ?? 0, pageViewCount ?? 0),
      visibility_change_count: Math.max(existingFalloff?.visibility_change_count ?? 0, visibilityChangeCount ?? 0),
      identified_email: identifiedEmail ?? existingFalloff?.identified_email ?? null,
      identified_email_source: identifiedEmail
        ? clean(safeContext.identifiedEmailSource)
        : existingFalloff?.identified_email_source ?? null,
      page_history: pageHistory,
      utm_source: existingFalloff?.utm_source ?? clean(safeContext.utmSource),
      utm_medium: existingFalloff?.utm_medium ?? clean(safeContext.utmMedium),
      utm_campaign: existingFalloff?.utm_campaign ?? clean(safeContext.utmCampaign),
      utm_term: existingFalloff?.utm_term ?? clean(safeContext.utmTerm),
      utm_content: existingFalloff?.utm_content ?? clean(safeContext.utmContent),
      device_type: getDeviceType(userAgent),
      platform: clean(safeContext.platform),
      connection_type: clean(safeContext.connectionType),
      touch_points: cleanInt(safeContext.touchPoints, 0, 100),
      max_scroll_percent: Math.max(existingFalloff?.max_scroll_percent ?? 0, maxScrollPercent ?? 0),
      portfolio_opened_at: existingFalloff?.portfolio_opened_at ?? (event === "portfolio_opened" || event === "portfolio_page_viewed" || event === "portfolio_project_opened" ? now : null),
      portfolio_pages_viewed: Math.max(existingFalloff?.portfolio_pages_viewed ?? 0, portfolioPage ?? 0),
      portfolio_project_opened_at: existingFalloff?.portfolio_project_opened_at ?? (event === "portfolio_project_opened" ? now : null),
      portfolio_project_opened: event === "portfolio_project_opened" ? portfolioProject : existingFalloff?.portfolio_project_opened ?? null,
      pricing_opened_at: existingFalloff?.pricing_opened_at ?? (event === "pricing_opened" ? now : null),
      buy_clicked_at: existingFalloff?.buy_clicked_at ?? (event === "checkout_started" || event === "chat_checkout_started" ? now : null),
      event_count: (existingFalloff?.event_count ?? 0) + 1,
      metadata: {
        ...existingMetadata,
        last_event: event,
        last_event_at: now,
        last_event_metadata: safeMetadata,
      },
      updated_at: now,
    };

    const enrichmentFinished = ["enriched", "failed", "unavailable"].includes(existingFalloff?.enrichment_status ?? "");
    if (existingFalloff && enrichmentFinished) {
      const { error } = await supabase
        .from("visitor_falloffs")
        .update(engagement)
        .eq("visitor_id", visitorId)
        .eq("session_id", sessionId);
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = Deno.env.get("IPINFO_TOKEN");
    const ip = getClientIp(req);
    const enrichment: Record<string, unknown> = {
      ip_address: ip,
      enrichment_source: "ipinfo",
      enrichment_status: token && ip ? "pending" : "unavailable",
      enrichment_error: token ? (ip ? null : "Could not detect visitor IP") : "IPINFO_TOKEN not configured",
    };

    if (token && ip) {
      try {
        const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}?token=${encodeURIComponent(token)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(`IPinfo lookup failed [${response.status}]`);

        const company = isRecord(data.company) ? data.company : {};
        const asn = isRecord(data.asn) ? data.asn : {};
        const privacy = isRecord(data.privacy) ? data.privacy : {};
        const carrier = isRecord(data.carrier) ? data.carrier : {};
        Object.assign(enrichment, {
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
          enrichment_status: "enriched",
          enrichment_error: null,
          enriched_at: now,
        });
      } catch (error) {
        Object.assign(enrichment, {
          enrichment_status: "failed",
          enrichment_error: error instanceof Error ? error.message.slice(0, 500) : "IPinfo lookup failed",
        });
      }
    }

    const { error } = await supabase
      .from("visitor_falloffs")
      .upsert({
        visitor_id: visitorId,
        session_id: sessionId,
        consent_status: "granted",
        first_page: existingFalloff?.first_page ?? pageUrl,
        referrer: cleanLong(safeContext.referrer),
        user_agent: userAgent,
        browser_language: clean(safeContext.language),
        timezone: clean(safeContext.timezone),
        screen_size: clean(safeContext.screen),
        viewport_size: clean(safeContext.viewport),
        ...engagement,
        ...enrichment,
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
