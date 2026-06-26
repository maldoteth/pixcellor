import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUYER_DISCOUNT_PCT = 10;
const AFFILIATE_COMMISSION_PCT = 5;

function randomCode() {
  // Short, easy-to-share, unambiguous alphabet (no O/0/I/1/L)
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!stripeSecretKey || !supabaseUrl || !serviceKey || !anonKey) {
      throw new Error("Server not configured");
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email || "";

    const supabase = createClient(supabaseUrl, serviceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    // try up to 8 times to find a non-colliding short code
    let code = "";
    for (let i = 0; i < 8; i++) {
      const candidate = randomCode();
      const { data: existing } = await supabase.from("affiliate_codes").select("id").eq("code", candidate).maybeSingle();
      if (!existing) { code = candidate; break; }
    }
    if (!code) throw new Error("Could not generate unique code, try again");

    // Create Stripe coupon (10% off, applies once)
    const coupon = await stripe.coupons.create({
      percent_off: BUYER_DISCOUNT_PCT,
      duration: "once",
      name: `Pixcellor affiliate ${code}`,
      metadata: {
        source: "pixcellor_affiliate",
        affiliate_user_id: userId,
        affiliate_commission_pct: String(AFFILIATE_COMMISSION_PCT),
      },
    });

    // Create matching promotion code
    const promo = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      metadata: {
        source: "pixcellor_affiliate",
        affiliate_user_id: userId,
        affiliate_commission_pct: String(AFFILIATE_COMMISSION_PCT),
      },
    });

    const { data: row, error: insErr } = await supabase
      .from("affiliate_codes")
      .insert({
        code,
        owner_user_id: userId,
        stripe_coupon_id: coupon.id,
        stripe_promotion_code_id: promo.id,
        buyer_discount_pct: BUYER_DISCOUNT_PCT,
        affiliate_commission_pct: AFFILIATE_COMMISSION_PCT,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    return new Response(JSON.stringify({ code: row.code, id: row.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
