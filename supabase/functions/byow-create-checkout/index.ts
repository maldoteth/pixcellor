/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  BYOW_SUB_PRICES,
  BYOW_TOPUP_PRICES,
  type BYOWTier,
  type BYOWTopup,
} from "../_shared/byow-pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://pixcellor.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!stripeKey || !supabaseUrl || !anonKey) throw new Error("Missing env");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    const user = userData.user;
    if (!user?.email) throw new Error("Not authenticated");

    const body = await req.json();
    const { site_id, kind, key } = body as {
      site_id: string;
      kind: "subscription" | "topup";
      key: string;
    };
    if (!site_id || !kind || !key) throw new Error("Missing parameters");

    // Verify user owns the site
    const { data: site, error: siteErr } = await supabaseClient
      .from("byow_sites")
      .select("id, display_name, owner_user_id")
      .eq("id", site_id)
      .maybeSingle();
    if (siteErr || !site) throw new Error("Site not found");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Reuse Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || SITE_URL;
    const successUrl = `${origin}/byow/site/${site_id}?checkout=success`;
    const cancelUrl = `${origin}/byow/site/${site_id}?checkout=cancelled`;

    let priceId: string;
    let mode: "subscription" | "payment";
    const metadata: Record<string, string> = {
      source: "byow",
      site_id,
      user_id: user.id,
      kind,
    };

    if (kind === "subscription") {
      const tier = key as BYOWTier;
      const cfg = BYOW_SUB_PRICES[tier];
      if (!cfg) throw new Error("Invalid tier");
      priceId = cfg.priceId;
      mode = "subscription";
      metadata.tier = tier;
      metadata.quota = String(cfg.quota);
    } else {
      const topup = key as BYOWTopup;
      const cfg = BYOW_TOPUP_PRICES[topup];
      if (!cfg) throw new Error("Invalid top-up pack");
      priceId = cfg.priceId;
      mode = "payment";
      metadata.topup = topup;
      metadata.prompts_added = String(cfg.prompts);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      ...(mode === "subscription" ? { subscription_data: { metadata } } : {}),
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[byow-create-checkout] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
