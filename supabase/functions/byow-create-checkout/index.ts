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
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeKey || !supabaseUrl || !anonKey || !serviceRole) throw new Error("Missing env");

    const body = await req.json();
    const { site_id, kind, key, lander, email: bodyEmail, display_name, affiliateRef } = body as {
      site_id?: string;
      kind: "subscription" | "topup";
      key: string;
      lander?: boolean;
      email?: string;
      display_name?: string;
      affiliateRef?: string;
    };
    const safeAffiliateRef = typeof affiliateRef === "string" && /^[A-Za-z0-9_-]{3,40}$/.test(affiliateRef) ? affiliateRef.toUpperCase() : "";
    if (!kind || !key) throw new Error("Missing parameters");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    let userId: string;
    let userEmail: string;
    let siteId: string;
    const origin = req.headers.get("origin") || SITE_URL;

    if (lander) {
      // ----- Public lander signup flow -----
      const email = (bodyEmail || "").trim().toLowerCase();
      const name = (display_name || "").trim();
      if (!email || !name) throw new Error("Email and site name required");
      if (kind === "topup") throw new Error("Top-ups require an existing site");

      // Find or invite the auth user
      let resolvedId: string | null = null;
      let page = 1;
      while (page <= 20) {
        const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (lErr) break;
        const hit = list.users.find((u) => (u.email || "").toLowerCase() === email);
        if (hit) { resolvedId = hit.id; break; }
        if (!list.users.length || list.users.length < 200) break;
        page++;
      }
      if (!resolvedId) {
        const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${origin}/customer-portal?tab=sites`,
        });
        if (invErr || !invited.user) throw new Error(`Could not create account: ${invErr?.message || "unknown"}`);
        resolvedId = invited.user.id;
      }
      userId = resolvedId;
      userEmail = email;

      // Create the site placeholder (status = pending_setup)
      const { data: site, error: sErr } = await admin
        .from("byow_sites")
        .insert({
          owner_user_id: userId,
          display_name: name,
          status: "pending_setup",
        })
        .select()
        .single();
      if (sErr || !site) throw new Error(sErr?.message || "Could not create site");
      siteId = site.id;
    } else {
      // ----- Authenticated client flow (top-up / change plan from portal) -----
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Not authenticated");
      const supabaseClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
      const user = userData.user;
      if (!user?.email) throw new Error("Not authenticated");
      if (!site_id) throw new Error("Missing site_id");

      const { data: site, error: siteErr } = await supabaseClient
        .from("byow_sites")
        .select("id, display_name, owner_user_id")
        .eq("id", site_id)
        .maybeSingle();
      if (siteErr || !site) throw new Error("Site not found");

      userId = user.id;
      userEmail = user.email;
      siteId = site.id;
    }

    // Reuse Stripe customer by email
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    const customerId = customers.data[0]?.id;

    const successUrl = `${origin}/customer-portal?tab=sites&site=${siteId}&checkout=success`;
    const cancelUrl = `${origin}${lander ? "/byow?checkout=cancelled" : `/customer-portal?tab=sites&site=${siteId}&checkout=cancelled`}`;

    let priceId: string;
    let mode: "subscription" | "payment";
    const metadata: Record<string, string> = {
      source: "byow",
      site_id: siteId,
      user_id: userId,
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
      customer_email: customerId ? undefined : userEmail,
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
