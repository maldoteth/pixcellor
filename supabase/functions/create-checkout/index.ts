import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// Defence-in-depth schema. Generous caps so any payload that previously
// worked still works — the existing slice/clean logic below truncates
// further per-field as before.
const BodySchema = z.object({
  priceId: z.string().min(1).max(200),
  mode: z.string().max(40).optional(),
  packageName: z.string().max(200).optional(),
  billing: z.string().max(40).optional(),
  clientContext: z.record(z.unknown()).optional(),
  buyer: z.object({
    email: z.string().max(2000).optional(),
    name: z.string().max(2000).optional(),
    company: z.string().max(2000).optional(),
    phone: z.string().max(2000).optional(),
  }).passthrough().optional(),
  domain: z.string().max(500).optional(),
  domainTopUpGbp: z.union([z.number(), z.string()]).optional(),
  visionBrief: z.object({
    prompt: z.string().max(20000).optional(),
    imageUrl: z.string().max(4000).optional(),
  }).passthrough().optional(),
}).passthrough();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const clean = (value: unknown) => typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null;
const getClientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || null;

// Server-side allowlist of public Stripe price IDs. Any priceId the client
// posts must be one of these — prevents attackers from initiating checkout at
// an arbitrary (e.g. discounted/test) price by guessing or harvesting other
// price IDs in the Stripe account.
const ALLOWED_PRICE_IDS = new Set<string>([
  // Vision / starter
  "price_1TQzD5BtUjwejeUwG4CFjskt",
  "price_1TJrT7BtUjwejeUwQ47tCkiv",
  "price_1TJrTNBtUjwejeUw3ihfpz98",
  // Growth / Scale / Enterprise (monthly + yearly)
  "price_1TcfyPBtUjwejeUwJmEbSWtN",
  "price_1Tcg03BtUjwejeUwr7mYzuUb",
  "price_1Tcg07BtUjwejeUwfGGDhftV",
  "price_1Tcg0ABtUjwejeUwLc5nw8nX",
  "price_1TSmB8BtUjwejeUw8UXRTbBQ",
  "price_1TSmBtBtUjwejeUwb8xPSvvf",
  // BYOW subscription tiers
  "price_1TiUpGBtUjwejeUwWVs10yfp",
  "price_1TiUpHBtUjwejeUwhjdoDCvI",
  "price_1TiUpJBtUjwejeUwDifHr1Px",
  // BYOW prompt packs
  "price_1TiUpKBtUjwejeUw3uCQ0uGP",
  "price_1TiUpKBtUjwejeUwgu5blcCQ",
  "price_1TiUpLBtUjwejeUwqXnPdicz",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let raw: unknown;
    try { raw = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsedBody = BodySchema.safeParse(raw);
    if (!parsedBody.success) {
      return new Response(JSON.stringify({ error: "invalid_input", fields: parsedBody.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { priceId, mode, packageName, billing, clientContext, buyer, domain, domainTopUpGbp, visionBrief } = parsedBody.data;

    if (!priceId) throw new Error("Missing priceId");
    if (!ALLOWED_PRICE_IDS.has(priceId)) {
      return new Response(JSON.stringify({ error: "invalid_price" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Domain add-on (optional). The domain is reserved in the basket and only
    // registered after the webhook confirms payment. See `register-domain`.
    const cleanDomain = typeof domain === "string"
      ? domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").slice(0, 253)
      : "";
    const validDomain = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(cleanDomain) ? cleanDomain : "";
    const topUpGbpNum = Number(domainTopUpGbp);
    // Cap at £5000 so premium domain top-ups (which can be hundreds or thousands) flow through correctly.
    const safeTopUpGbp = Number.isFinite(topUpGbpNum) && topUpGbpNum >= 0 && topUpGbpNum <= 5000 ? Math.round(topUpGbpNum * 100) / 100 : 0;
    const buyerEmail = buyer && typeof buyer.email === "string" ? buyer.email.trim().slice(0, 200) : "";
    const buyerName = buyer && typeof buyer.name === "string" ? buyer.name.trim().slice(0, 120) : "";
    const buyerCompany = buyer && typeof buyer.company === "string" ? buyer.company.trim().slice(0, 200) : "";
    const buyerPhone = buyer && typeof buyer.phone === "string" ? buyer.phone.trim().slice(0, 40) : "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY not configured");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin");
    if (!origin) throw new Error("Missing request origin");

    const hasTrackingConsent = clientContext && typeof clientContext === "object";
    const safeClientContext = hasTrackingConsent ? clientContext as Record<string, unknown> : {};
    const clientReferenceId = typeof safeClientContext.clientId === "string" ? safeClientContext.clientId.slice(0, 200) : undefined;

    const checkoutMode = mode || "payment";
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: priceId, quantity: 1 }];

    // Domain add-on becomes a second line item whenever a domain is being registered.
    // The customer pays the full first-year price (cost + markup) — no allowance.
    if (validDomain && safeTopUpGbp > 0 && checkoutMode === "payment") {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(safeTopUpGbp * 100),
          product_data: {
            name: `Domain registration: ${validDomain}`,
            description: "First year, includes free WHOIS privacy and SSL.",
          },
        },
      });
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: checkoutMode,
      success_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=canceled`,
      client_reference_id: clientReferenceId,
      ...(buyerEmail ? { customer_email: buyerEmail } : {}),
      metadata: {
        source: "pixcellor_site",
        package_name: typeof packageName === "string" ? packageName : "",
        billing: typeof billing === "string" ? billing : checkoutMode,
        client_id: clientReferenceId ?? "",
        checkout_context: hasTrackingConsent ? JSON.stringify(safeClientContext).slice(0, 500) : "",
        buyer_name: buyerName,
        buyer_company: buyerCompany,
        buyer_phone: buyerPhone,
        buyer_email: buyerEmail,
        domain_to_register: validDomain,
        domain_top_up_gbp: validDomain ? String(safeTopUpGbp) : "",
        vision_prompt: visionBrief && typeof visionBrief.prompt === "string" ? visionBrief.prompt.slice(0, 500) : "",
        vision_image_url: visionBrief && typeof visionBrief.imageUrl === "string" ? visionBrief.imageUrl.slice(0, 500) : "",
      },
    };

    // Authorize-and-capture: for one-off payments we authorize the card now and
    // only capture (charge) once we've reviewed the order. Stripe does NOT support
    // manual capture on subscriptions, so subscriptions stay as immediate-charge.
    if (checkoutMode === "payment") {
      sessionParams.payment_intent_data = {
        capture_method: "manual",
        description: `Pixcellor – ${typeof packageName === "string" && packageName ? packageName : "order"}`,
      };
    } else if (checkoutMode === "subscription") {
      // Stamp the subscription itself with our metadata so downstream
      // invoice.* and customer.subscription.* webhooks can identify Pixcellor
      // subs (we filter on metadata.source === "pixcellor_site").
      sessionParams.subscription_data = {
        metadata: {
          source: "pixcellor_site",
          package_name: typeof packageName === "string" ? packageName : "",
          billing: typeof billing === "string" ? billing : checkoutMode,
          price_id: priceId,
          buyer_email: buyerEmail,
          buyer_company: buyerCompany,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Save buyer as a "hot" lead immediately on Buy click. The stripe webhook will
    // upgrade them to "gold" when checkout actually completes. If they fall off,
    // they remain a hot lead with a note explaining where they dropped.
    if (buyerEmail || buyerPhone) {
      try {
        const supabaseLead = createClient(supabaseUrl, supabaseServiceRoleKey);
        const companyName = (buyerCompany || buyerName || "Buyer").slice(0, 100);
        const contactName = buyerName.slice(0, 100) || null;
        const note = `Fell off at buy — started checkout for ${typeof packageName === "string" && packageName ? packageName : "order"} (${session.id})`;

        let existingId: string | null = null;
        if (buyerEmail) {
          const { data } = await supabaseLead.from("contacts").select("id,status").ilike("email", buyerEmail).maybeSingle();
          if (data?.id) existingId = data.id;
        }
        if (!existingId && buyerPhone) {
          const { data } = await supabaseLead.from("contacts").select("id,status").eq("phone", buyerPhone).maybeSingle();
          if (data?.id) existingId = data.id;
        }

        if (existingId) {
          // Don't downgrade an existing gold/client.
          const { data: existing } = await supabaseLead.from("contacts").select("status").eq("id", existingId).maybeSingle();
          const currentStatus = (existing?.status || "").toLowerCase();
          const update: Record<string, unknown> = {
            ...(buyerEmail ? { email: buyerEmail } : {}),
            ...(buyerPhone ? { phone: buyerPhone } : {}),
            ...(contactName ? { contact_name: contactName } : {}),
            notes: note,
            updated_at: new Date().toISOString(),
          };
          if (currentStatus !== "gold") update.status = "hot";
          await supabaseLead.from("contacts").update(update).eq("id", existingId);
        } else {
          await supabaseLead.from("contacts").insert({
            name: companyName,
            contact_name: contactName,
            email: buyerEmail || null,
            phone: buyerPhone || null,
            status: "hot",
            source: "stripe_checkout_started",
            notes: note,
          });
        }
      } catch (err) {
        console.error("Failed to save buyer lead", err);
      }
    }

    const sessionId = typeof safeClientContext.sessionId === "string" ? safeClientContext.sessionId.slice(0, 200) : undefined;
    if (hasTrackingConsent && clientReferenceId && sessionId) {
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      const enrichment: Record<string, unknown> = { enrichment_status: "pending" };
      const ipinfoToken = Deno.env.get("IPINFO_TOKEN");
      const ip = getClientIp(req);

      if (ipinfoToken && ip) {
        try {
          const ipinfoResponse = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}?token=${encodeURIComponent(ipinfoToken)}`);
          const ipinfo = await ipinfoResponse.json();
          if (!ipinfoResponse.ok) throw new Error(`IPinfo lookup failed [${ipinfoResponse.status}]`);
          const company = ipinfo.company && typeof ipinfo.company === "object" ? ipinfo.company : {};
          const asn = ipinfo.asn && typeof ipinfo.asn === "object" ? ipinfo.asn : {};
          const privacy = ipinfo.privacy && typeof ipinfo.privacy === "object" ? ipinfo.privacy : {};
          const carrier = ipinfo.carrier && typeof ipinfo.carrier === "object" ? ipinfo.carrier : {};
          Object.assign(enrichment, {
            ip_address: clean(ipinfo.ip) ?? ip,
            ip_hostname: clean(ipinfo.hostname),
            ip_city: clean(ipinfo.city),
            ip_region: clean(ipinfo.region),
            ip_country: clean(ipinfo.country),
            ip_location: clean(ipinfo.loc),
            ip_postal: clean(ipinfo.postal),
            ip_timezone: clean(ipinfo.timezone),
            company_name: clean(company.name) ?? clean(ipinfo.org),
            company_domain: clean(company.domain),
            company_type: clean(company.type),
            asn: clean(asn.asn),
            as_name: clean(asn.name) ?? clean(ipinfo.org),
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
          });
        } catch (error) {
          Object.assign(enrichment, { ip_address: ip, enrichment_source: "ipinfo", enrichment_status: "failed", enrichment_error: error instanceof Error ? error.message.slice(0, 500) : "IPinfo lookup failed" });
        }
      }

      await supabase.from("visitor_falloffs").upsert({
        visitor_id: clientReferenceId,
        session_id: sessionId,
        consent_status: "granted",
        first_page: typeof safeClientContext.pageUrl === "string" ? safeClientContext.pageUrl : null,
        last_page: typeof safeClientContext.pageUrl === "string" ? safeClientContext.pageUrl : null,
        referrer: typeof safeClientContext.referrer === "string" ? safeClientContext.referrer : null,
        user_agent: typeof safeClientContext.userAgent === "string" ? safeClientContext.userAgent : null,
        browser_language: typeof safeClientContext.language === "string" ? safeClientContext.language : null,
        timezone: typeof safeClientContext.timezone === "string" ? safeClientContext.timezone : null,
        screen_size: typeof safeClientContext.screen === "string" ? safeClientContext.screen : null,
        viewport_size: typeof safeClientContext.viewport === "string" ? safeClientContext.viewport : null,
        max_scroll_percent: Number.isFinite(Number(safeClientContext.maxScrollPercent)) ? Math.max(0, Math.min(100, Math.round(Number(safeClientContext.maxScrollPercent)))) : 0,
        checkout_session_id: session.id,
        package_name: typeof packageName === "string" ? packageName : null,
        billing: typeof billing === "string" ? billing : mode || "payment",
        price_id: typeof priceId === "string" ? priceId : null,
        buy_clicked_at: new Date().toISOString(),
        checkout_started_at: typeof safeClientContext.startedAt === "string" ? safeClientContext.startedAt : new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        metadata: { checkout_url_created: true },
        ...enrichment,
      }, { onConflict: "visitor_id,session_id" });
    }

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
