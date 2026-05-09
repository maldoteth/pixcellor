/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PORKBUN_BASE = "https://api.porkbun.com/api/json/v3";
const ALLOWANCE_GBP = 10;
const USD_TO_GBP = 0.82;

// Hard ceiling for cost we'll auto-pay (allowance + safety buffer over top-up).
// If price drifted way past what the buyer paid, we refuse and flag for admin.
const PRICE_DRIFT_BUFFER_GBP = 5;

async function porkbunCheck(domain: string, apikey: string, secret: string) {
  const res = await fetch(`${PORKBUN_BASE}/domain/checkDomain/${domain}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey, secretapikey: secret }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json?.status !== "ERROR", json };
}

async function porkbunCreate(opts: {
  domain: string;
  costPenniesUsd: number;
  apikey: string;
  secret: string;
  idempotencyKey: string;
}) {
  const res = await fetch(`${PORKBUN_BASE}/domain/create/${opts.domain}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": opts.idempotencyKey,
    },
    body: JSON.stringify({
      apikey: opts.apikey,
      secretapikey: opts.secret,
      cost: opts.costPenniesUsd,
      agreeToTerms: "yes",
    }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json?.status !== "ERROR", status: res.status, json };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apikey = Deno.env.get("PORKBUN_API_KEY");
    const secret = Deno.env.get("PORKBUN_SECRET_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apikey || !secret) throw new Error("Porkbun credentials not configured");
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase service credentials missing");

    const body = await req.json().catch(() => ({}));
    const sessionId: string = body?.sessionId;
    if (!sessionId) throw new Error("sessionId required");

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: order, error: orderErr } = await supabase
      .from("stripe_checkout_sessions")
      .select("session_id, domain, domain_status, domain_top_up_gbp, customer_email")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (orderErr) throw orderErr;
    if (!order) throw new Error("Order not found");
    const domain = (order.domain ?? "").toLowerCase().trim();
    if (!domain) {
      return new Response(JSON.stringify({ skipped: "no_domain" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Idempotency at our layer: if already active, return success.
    const { data: existing } = await supabase
      .from("domain_registrations")
      .select("id, status, registrar_response, expires_at")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (existing && existing.status === "active") {
      return new Response(JSON.stringify({ ok: true, alreadyRegistered: true, expiresAt: existing.expires_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Upsert pending row before calling Porkbun.
    const idempotencyKey = `pixcellor-order-${sessionId}`;
    await supabase.from("domain_registrations").upsert({
      session_id: sessionId,
      domain,
      status: "pending",
      idempotency_key: idempotencyKey,
      attempts: (existing?.status === "pending" ? 1 : 0) + 1,
    }, { onConflict: "session_id" });

    // Re-check availability + price.
    const check = await porkbunCheck(domain, apikey, secret);
    if (!check.ok) {
      const msg = `Porkbun checkDomain failed: ${JSON.stringify(check.json).slice(0, 300)}`;
      await supabase.from("domain_registrations").update({ status: "failed", error: msg }).eq("session_id", sessionId);
      await supabase.from("stripe_checkout_sessions").update({ domain_status: "failed" }).eq("session_id", sessionId);
      throw new Error(msg);
    }
    const r = check.json?.response ?? {};
    const available = String(r.avail ?? "").toLowerCase() === "yes";
    const isPremium = String(r.premium ?? "").toLowerCase() === "yes";
    const priceUsd = Number(r.firstYearPromo ?? r.price ?? NaN);

    if (!available || isPremium || !Number.isFinite(priceUsd)) {
      const msg = !available ? "Domain no longer available" : isPremium ? "Domain became premium" : "Price unavailable";
      await supabase.from("domain_registrations").update({ status: "failed", error: msg }).eq("session_id", sessionId);
      await supabase.from("stripe_checkout_sessions").update({ domain_status: "failed" }).eq("session_id", sessionId);
      return new Response(JSON.stringify({ ok: false, error: msg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceGbp = priceUsd * USD_TO_GBP;
    const paidTopUp = Number(order.domain_top_up_gbp ?? 0);
    const maxAllowedGbp = ALLOWANCE_GBP + paidTopUp + PRICE_DRIFT_BUFFER_GBP;

    if (priceGbp > maxAllowedGbp) {
      const msg = `Price drifted (£${priceGbp.toFixed(2)} > allowed £${maxAllowedGbp.toFixed(2)})`;
      await supabase.from("domain_registrations").update({ status: "failed", error: msg }).eq("session_id", sessionId);
      await supabase.from("stripe_checkout_sessions").update({ domain_status: "failed" }).eq("session_id", sessionId);
      return new Response(JSON.stringify({ ok: false, error: msg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Porkbun expects cost in "pennies" — i.e. cents (USD * 100).
    const costPenniesUsd = Math.round(priceUsd * 100);
    const create = await porkbunCreate({ domain, costPenniesUsd, apikey, secret, idempotencyKey });

    if (!create.ok) {
      const msg = `Porkbun create failed [${create.status}]: ${JSON.stringify(create.json).slice(0, 400)}`;
      await supabase.from("domain_registrations").update({
        status: "failed",
        error: msg,
        registrar_response: create.json,
      }).eq("session_id", sessionId);
      await supabase.from("stripe_checkout_sessions").update({ domain_status: "failed" }).eq("session_id", sessionId);
      return new Response(JSON.stringify({ ok: false, error: msg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await supabase.from("domain_registrations").update({
      status: "active",
      error: null,
      registrar_response: create.json,
      expires_at: expiresAt.toISOString(),
    }).eq("session_id", sessionId);

    await supabase.from("stripe_checkout_sessions").update({
      domain_status: "active",
    }).eq("session_id", sessionId);

    return new Response(JSON.stringify({ ok: true, domain, expiresAt: expiresAt.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "register-domain failed";
    console.error("[register-domain]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
