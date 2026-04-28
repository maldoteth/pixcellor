import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, mode, packageName, billing, clientContext } = await req.json();
    
    if (!priceId) throw new Error("Missing priceId");
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

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode || "payment",
      success_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=canceled`,
      client_reference_id: clientReferenceId,
      metadata: {
        source: "pixcellor_site",
        package_name: typeof packageName === "string" ? packageName : "",
        billing: typeof billing === "string" ? billing : mode || "payment",
        client_id: clientReferenceId ?? "",
        checkout_context: hasTrackingConsent ? JSON.stringify(safeClientContext).slice(0, 500) : "",
      },
    });

    const sessionId = typeof safeClientContext.sessionId === "string" ? safeClientContext.sessionId.slice(0, 200) : undefined;
    if (hasTrackingConsent && clientReferenceId && sessionId) {
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
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
        checkout_session_id: session.id,
        package_name: typeof packageName === "string" ? packageName : null,
        billing: typeof billing === "string" ? billing : mode || "payment",
        price_id: typeof priceId === "string" ? priceId : null,
        checkout_started_at: typeof safeClientContext.startedAt === "string" ? safeClientContext.startedAt : new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        metadata: { checkout_url_created: true },
      }, { onConflict: "visitor_id,session_id" });
    }

    return new Response(JSON.stringify({ url: session.url }), {
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
