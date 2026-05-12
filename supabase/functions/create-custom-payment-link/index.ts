import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const user = userData.user;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const description = String(body.description ?? "").trim();
    const amount = Number(body.amount_gbp);
    const quantity = Math.max(1, Math.min(100, Number(body.quantity ?? 1) | 0));
    const mode = body.mode === "subscription" ? "subscription" : "payment";
    const clientEmail = (typeof body.client_email === "string" ? body.client_email.trim().toLowerCase() : "") || null;
    const internalNote = (typeof body.internal_note === "string" ? body.internal_note.trim() : "") || null;

    if (!description || description.length > 200) return json({ error: "Description required (max 200 chars)" }, 400);
    if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000)
      return json({ error: "Amount must be between £1 and £1,000,000" }, 400);
    if (clientEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail))
      return json({ error: "Invalid client email" }, 400);
    if (internalNote && internalNote.length > 1000) return json({ error: "Note too long" }, 400);

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    const product = await stripe.products.create({
      name: description.slice(0, 250),
      metadata: { kind: "custom", created_by_email: user.email ?? "" },
    });

    const priceParams: Stripe.PriceCreateParams = {
      product: product.id,
      currency: "gbp",
      unit_amount: Math.round(amount * 100),
    };
    if (mode === "subscription") priceParams.recurring = { interval: "month" };
    const price = await stripe.prices.create(priceParams);

    const linkRowDraft = await admin
      .from("custom_payment_links")
      .insert({
        created_by_user_id: user.id,
        created_by_email: user.email ?? null,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        url: "pending",
        description,
        amount_gbp: amount,
        currency: "gbp",
        quantity,
        mode,
        client_email: clientEmail,
        internal_note: internalNote,
        status: "open",
      })
      .select("id")
      .single();
    if (linkRowDraft.error || !linkRowDraft.data) throw linkRowDraft.error || new Error("Insert failed");
    const linkId = linkRowDraft.data.id;

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity }],
      metadata: {
        kind: "custom",
        custom_link_id: linkId,
        client_email: clientEmail ?? "",
        package_name: description.slice(0, 80),
      },
      ...(mode === "payment"
        ? { payment_intent_data: { metadata: { kind: "custom", custom_link_id: linkId } } }
        : { subscription_data: { metadata: { kind: "custom", custom_link_id: linkId } } }),
    });

    await admin
      .from("custom_payment_links")
      .update({ stripe_payment_link_id: paymentLink.id, url: paymentLink.url })
      .eq("id", linkId);

    return json({ id: linkId, url: paymentLink.url });
  } catch (err) {
    console.error("create-custom-payment-link error", err);
    const message = err instanceof Error ? err.message : "Failed to create payment link";
    return json({ error: message }, 500);
  }
});
