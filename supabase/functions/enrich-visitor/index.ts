import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const clean = (value: unknown) => typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null;

const getClientIp = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { visitorId, sessionId } = await req.json();
    if (typeof visitorId !== "string" || visitorId.length < 8 || visitorId.length > 200) throw new Error("Invalid visitorId");
    if (typeof sessionId !== "string" || sessionId.length < 8 || sessionId.length > 200) throw new Error("Invalid sessionId");

    const token = Deno.env.get("IPINFO_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!token) throw new Error("IPINFO_TOKEN not configured");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    const ip = getClientIp(req);
    if (!ip) throw new Error("Could not detect visitor IP");

    const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}?token=${encodeURIComponent(token)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(`IPinfo lookup failed [${response.status}]: ${JSON.stringify(data).slice(0, 300)}`);

    const company = data.company && typeof data.company === "object" ? data.company : {};
    const asn = data.asn && typeof data.asn === "object" ? data.asn : {};
    const privacy = data.privacy && typeof data.privacy === "object" ? data.privacy : {};
    const carrier = data.carrier && typeof data.carrier === "object" ? data.carrier : {};

    const supabase = createClient(supabaseUrl, serviceKey);
    const { error } = await supabase
      .from("visitor_falloffs")
      .update({
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
      })
      .eq("visitor_id", visitorId)
      .eq("session_id", sessionId);

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