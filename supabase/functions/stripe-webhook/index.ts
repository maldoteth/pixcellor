/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY not configured");
    if (!stripeWebhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    const bodyText = await req.text();
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
    const event = await stripe.webhooks.constructEventAsync(bodyText, signature, stripeWebhookSecret);

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const eventObject = event.data.object as Record<string, unknown>;
    const rawSessionId = eventObject.id;
    const sessionId = typeof rawSessionId === "string" ? rawSessionId : null;

    const formatGBP = (amount: number | null | undefined) =>
      typeof amount === "number" ? `£${(amount / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : undefined;

    const templateForPackage = (packageName?: string | null) => {
      const clean = (packageName ?? "").toLowerCase();
      if (clean.includes("retainer")) return "retainer-order-confirmation";
      if (clean.includes("elite")) return "elite-order-confirmation";
      return "full-works-order-confirmation";
    };

    const eventInsert = await supabase.from("stripe_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: eventObject,
      checkout_session_id: sessionId,
    });

    if (eventInsert.error && eventInsert.error.code !== "23505") {
      throw new Error(`Failed to insert stripe event: ${eventInsert.error.message}`);
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentStatus =
        typeof session.payment_status === "string" ? session.payment_status : null;
      const mode = session.mode ?? null;
      const status =
        event.type === "checkout.session.completed"
          ? "completed"
          : event.type === "checkout.session.expired"
            ? "expired"
            : event.type === "checkout.session.async_payment_succeeded"
              ? "paid"
              : "failed";

      const sessionUpsert = await supabase.from("stripe_checkout_sessions").upsert(
        {
          session_id: session.id,
          stripe_event_id: event.id,
          mode,
          payment_status: paymentStatus,
          status,
          amount_total: session.amount_total ?? null,
          currency: session.currency ?? null,
          customer_email: session.customer_details?.email ?? null,
          customer_id: typeof session.customer === "string" ? session.customer : null,
          subscription_id: typeof session.subscription === "string" ? session.subscription : null,
          metadata: session.metadata ?? {},
        },
        { onConflict: "session_id" },
      );

      if (sessionUpsert.error) {
        throw new Error(`Failed to upsert checkout session: ${sessionUpsert.error.message}`);
      }

      if (event.type === "checkout.session.completed" && paymentStatus === "paid" && session.customer_details?.email) {
        const packageName = session.metadata?.package_name || "Full Works";
        const templateData = {
          customerEmail: session.customer_details.email,
          orderId: session.id,
          packageName,
          amount: formatGBP(session.amount_total),
          billing: session.metadata?.billing || session.mode || "payment",
        };

        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: templateForPackage(packageName),
            recipientEmail: session.customer_details.email,
            idempotencyKey: `order-confirmation-${session.id}`,
            templateData,
          },
        });

        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "internal-new-order-notification",
            recipientEmail: "projects@pixcellor.com",
            idempotencyKey: `internal-order-notification-${session.id}`,
            templateData,
          },
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
