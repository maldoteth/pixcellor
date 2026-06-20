import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_PAYOUT_CENTS = 2500; // £25
const CLEARED_STATUSES = ["earned", "cleared", "approved", "paid"];
const RESERVED_PAYOUT_STATUSES = ["requested", "approved", "paid"];

const BankSchema = z.object({
  method: z.literal("bank"),
  account_holder_name: z.string().trim().min(2).max(120),
  sort_code: z.string().min(1),
  account_number: z.string().min(1),
  amount_cents: z.number().int().positive().optional(),
});

const CryptoSchema = z.object({
  method: z.literal("crypto"),
  crypto_currency: z.enum(["ETH", "BTC"]),
  wallet_address: z.string().trim().min(10).max(120),
  amount_cents: z.number().int().positive().optional(),
});

const BodySchema = z.discriminatedUnion("method", [BankSchema, CryptoSchema]);

const ETH_RE = /^0x[a-fA-F0-9]{40}$/;
const BTC_LEGACY_RE = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const BTC_BECH32_RE = /^bc1[a-z0-9]{25,62}$/;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json(500, { error: "Server not configured" });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json(401, { error: "unauthenticated" });

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData.user) return json(401, { error: "unauthenticated" });
    const userId = userData.user.id;

    let bodyJson: unknown;
    try {
      bodyJson = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const parsed = BodySchema.safeParse(bodyJson);
    if (!parsed.success) {
      return json(400, { error: "Invalid request", details: parsed.error.flatten() });
    }
    const data = parsed.data;

    // Field-specific validation
    let sortCodeNorm: string | null = null;
    let accountNumberNorm: string | null = null;
    let walletNorm: string | null = null;

    if (data.method === "bank") {
      sortCodeNorm = data.sort_code.replace(/[\s-]/g, "");
      accountNumberNorm = data.account_number.replace(/\s/g, "");
      if (!/^\d{6}$/.test(sortCodeNorm)) {
        return json(400, { error: "Sort code must be exactly 6 digits" });
      }
      if (!/^\d{8}$/.test(accountNumberNorm)) {
        return json(400, { error: "Account number must be exactly 8 digits" });
      }
    } else {
      walletNorm = data.wallet_address.trim();
      if (data.crypto_currency === "ETH") {
        if (!ETH_RE.test(walletNorm)) return json(400, { error: "Invalid ETH wallet address" });
      } else {
        if (!BTC_LEGACY_RE.test(walletNorm) && !BTC_BECH32_RE.test(walletNorm)) {
          return json(400, { error: "Invalid BTC wallet address" });
        }
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Compute available balance
    const { data: referrals, error: refErr } = await supabase
      .from("affiliate_referrals")
      .select("commission_cents,status")
      .eq("owner_user_id", userId)
      .in("status", CLEARED_STATUSES);
    if (refErr) return json(500, { error: refErr.message });
    const earnedCents = (referrals ?? []).reduce(
      (s, r) => s + Number(r.commission_cents ?? 0),
      0,
    );

    const { data: priorPayouts, error: payErr } = await supabase
      .from("affiliate_payouts")
      .select("amount_cents,status")
      .eq("owner_user_id", userId)
      .in("status", RESERVED_PAYOUT_STATUSES);
    if (payErr) return json(500, { error: payErr.message });
    const reservedCents = (priorPayouts ?? []).reduce(
      (s, r) => s + Number(r.amount_cents ?? 0),
      0,
    );

    const availableCents = Math.max(0, earnedCents - reservedCents);
    const hasOpen = (priorPayouts ?? []).some((p) =>
      p.status === "requested" || p.status === "approved"
    );
    if (hasOpen) {
      return json(409, { error: "You already have an open withdrawal request." });
    }

    const requestedAmount = data.amount_cents ?? availableCents;
    if (requestedAmount < MIN_PAYOUT_CENTS) {
      return json(400, { error: `Minimum withdrawal is £${(MIN_PAYOUT_CENTS / 100).toFixed(2)}` });
    }
    if (requestedAmount > availableCents) {
      return json(400, {
        error: "Requested amount exceeds your available balance",
        available_cents: availableCents,
      });
    }

    const insertRow =
      data.method === "bank"
        ? {
            owner_user_id: userId,
            amount_cents: requestedAmount,
            currency: "GBP",
            method: "bank" as const,
            status: "requested" as const,
            account_holder_name: data.account_holder_name.trim(),
            sort_code: sortCodeNorm!,
            account_number: accountNumberNorm!,
          }
        : {
            owner_user_id: userId,
            amount_cents: requestedAmount,
            currency: "GBP",
            method: "crypto" as const,
            status: "requested" as const,
            crypto_currency: data.crypto_currency,
            wallet_address: walletNorm!,
          };

    const { data: row, error: insErr } = await supabase
      .from("affiliate_payouts")
      .insert(insertRow)
      .select("id, amount_cents, currency, method, status, created_at")
      .single();
    if (insErr) {
      if ((insErr as any).code === "23505") {
        return json(409, { error: "You already have an open withdrawal request." });
      }
      return json(500, { error: insErr.message });
    }

    // Masked summary
    const masked =
      data.method === "bank"
        ? { destination: `•••• ${accountNumberNorm!.slice(-4)}` }
        : {
            destination: `${walletNorm!.slice(0, 6)}…${walletNorm!.slice(-4)}`,
            network: data.crypto_currency,
          };

    return json(200, {
      ok: true,
      payout: {
        id: row.id,
        amount_cents: row.amount_cents,
        currency: row.currency,
        method: row.method,
        status: row.status,
        created_at: row.created_at,
        ...masked,
      },
      available_cents_after: availableCents - requestedAmount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(500, { error: message });
  }
});
