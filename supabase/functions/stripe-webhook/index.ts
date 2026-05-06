/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://pixcellor.com";
// Card authorizations expire after ~7 days on most networks. Tracked so we can
// auto-capture or warn before we lose the auth.
const AUTH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const formatGBP = (amount: number | null | undefined) =>
  typeof amount === "number" ? `£${(amount / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : undefined;

const templateForPackage = (packageName?: string | null) => {
  const clean = (packageName ?? "").toLowerCase();
  if (clean.includes("retainer")) return "retainer-order-confirmation";
  if (clean.includes("elite")) return "elite-order-confirmation";
  return "full-works-order-confirmation";
};

async function sendOrderConfirmationEmails(opts: {
  supabaseUrl: string;
  serviceRoleKey: string;
  session: Stripe.Checkout.Session | { id: string; customer_details: { email?: string | null } | null; amount_total: number | null; mode?: string | null; metadata?: Record<string, string> | null };
  supabase: ReturnType<typeof createClient>;
  idempotencySuffix: string;
}) {
  const { supabaseUrl, serviceRoleKey, session, supabase, idempotencySuffix } = opts;
  const email = session.customer_details?.email;
  if (!email) return;

  const { data: publicReference, error: publicReferenceError } = await supabase.rpc("ensure_order_public_reference", { _session_id: session.id });
  if (publicReferenceError) throw publicReferenceError;
  const orderCode = typeof publicReference?.order_code === "string" ? publicReference.order_code : session.id;
  const requirementsToken = typeof publicReference?.requirements_token === "string" ? publicReference.requirements_token : null;
  const packageName = session.metadata?.package_name || "Full Works";
  const requirementsUrl = requirementsToken
    ? `${SITE_URL}/project-requirements?order=${encodeURIComponent(orderCode)}&token=${encodeURIComponent(requirementsToken)}`
    : `${SITE_URL}/project-requirements`;
  const templateData = {
    requirementsUrl,
    customerEmail: email,
    orderId: orderCode,
    packageName,
    amount: formatGBP(session.amount_total ?? null),
    billing: session.metadata?.billing || session.mode || "payment",
  };

  const emailHeaders = {
    "Authorization": `Bearer ${serviceRoleKey}`,
    "apikey": serviceRoleKey,
    "Content-Type": "application/json",
  };

  await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: emailHeaders,
    body: JSON.stringify({
      templateName: templateForPackage(packageName),
      recipientEmail: email,
      idempotencyKey: `order-confirmation-${session.id}-${idempotencySuffix}`,
      templateData,
    }),
  });

  await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: emailHeaders,
    body: JSON.stringify({
      templateName: "internal-new-order-notification",
      recipientEmail: "projects@pixcellor.com",
      idempotencyKey: `internal-order-notification-${session.id}-${idempotencySuffix}`,
      templateData,
    }),
  });
}

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

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: { headers: { Authorization: `Bearer ${supabaseServiceRoleKey}` } },
    });
    const eventObject = event.data.object as Record<string, unknown>;
    const rawSessionId = eventObject.id;
    const sessionId = typeof rawSessionId === "string" ? rawSessionId : null;

    const eventInsert = await supabase.from("stripe_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: eventObject,
      checkout_session_id: sessionId,
    });

    if (eventInsert.error && eventInsert.error.code !== "23505") {
      throw new Error(`Failed to insert stripe event: ${eventInsert.error.message}`);
    }

    // ---- Checkout session events ----
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;

      // Stripe is shared with another app — only process Pixcellor checkouts.
      const sessionSource = typeof session.metadata?.source === "string" ? session.metadata.source : null;
      if (sessionSource !== "pixcellor_site") {
        return new Response(JSON.stringify({ received: true, skipped: "non_pixcellor_source" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const paymentStatus = typeof session.payment_status === "string" ? session.payment_status : null;
      const mode = session.mode ?? null;
      const status =
        event.type === "checkout.session.completed"
          ? "completed"
          : event.type === "checkout.session.expired"
            ? "expired"
            : event.type === "checkout.session.async_payment_succeeded"
              ? "paid"
              : "failed";

      // For one-off payments using manual capture, look up the PI to learn whether
      // we have an authorization (requires_capture) or a real charge (succeeded).
      let paymentIntentId: string | null = typeof session.payment_intent === "string" ? session.payment_intent : null;
      let captureStatus: string | null = null;
      let authExpiresAt: string | null = null;
      let capturedAt: string | null = null;
      let pi: Stripe.PaymentIntent | null = null;
      if (paymentIntentId && mode === "payment") {
        try {
          pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (pi.status === "requires_capture") {
            captureStatus = "requires_capture";
            authExpiresAt = new Date(Date.now() + AUTH_EXPIRY_MS).toISOString();
          } else if (pi.status === "succeeded") {
            captureStatus = "captured";
            capturedAt = new Date().toISOString();
          } else if (pi.status === "canceled") {
            captureStatus = "canceled";
          } else {
            captureStatus = pi.status;
          }
        } catch (err) {
          console.error("Could not retrieve payment intent", err);
        }
      } else if (mode === "subscription") {
        captureStatus = "n/a";
      }

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
          payment_intent_id: paymentIntentId,
          capture_status: captureStatus,
          auth_expires_at: authExpiresAt,
          captured_at: capturedAt,
          metadata: {
            ...(session.metadata ?? {}),
            client_reference_id: session.client_reference_id ?? null,
            customer_details: session.customer_details ?? null,
          },
        },
        { onConflict: "session_id" },
      );

      if (sessionUpsert.error) {
        throw new Error(`Failed to upsert checkout session: ${sessionUpsert.error.message}`);
      }

      // Add buyer as a gold-status contact (one per email/phone). Safe to run on every event.
      if (event.type === "checkout.session.completed") {
        try {
          const meta = (session.metadata ?? {}) as Record<string, string>;
          const buyerEmail = (meta.buyer_email || session.customer_details?.email || "").trim().toLowerCase() || null;
          const buyerPhone = (meta.buyer_phone || "").trim() || null;
          const buyerName = (meta.buyer_company || meta.buyer_name || session.customer_details?.name || "Customer").trim().slice(0, 100);
          const buyerContactName = (meta.buyer_name || "").trim().slice(0, 100) || null;

          if (buyerEmail || buyerPhone) {
            // Check for existing contact by email or phone
            let existingId: string | null = null;
            if (buyerEmail) {
              const { data } = await supabase.from("contacts").select("id").ilike("email", buyerEmail).maybeSingle();
              if (data?.id) existingId = data.id;
            }
            if (!existingId && buyerPhone) {
              const { data } = await supabase.from("contacts").select("id").eq("phone", buyerPhone).maybeSingle();
              if (data?.id) existingId = data.id;
            }

            if (existingId) {
              await supabase.from("contacts").update({
                status: "gold",
                ...(buyerEmail ? { email: buyerEmail } : {}),
                ...(buyerPhone ? { phone: buyerPhone } : {}),
                ...(buyerContactName ? { contact_name: buyerContactName } : {}),
                updated_at: new Date().toISOString(),
              }).eq("id", existingId);
            } else {
              await supabase.from("contacts").insert({
                name: buyerName,
                contact_name: buyerContactName,
                email: buyerEmail,
                phone: buyerPhone,
                status: "gold",
                source: "stripe_checkout",
                notes: `Auto-added on purchase: ${meta.package_name || "order"} (${session.id})`,
              });
            }
          }
        } catch (err) {
          console.error("Failed to upsert buyer contact", err);
        }
      }

      // Decide which emails to send.
      // - Subscriptions (Elite retainer, £150/yr renewals) → immediate confirmation as before.
      // - One-off payments that ended up captured immediately (wallets / non-card) → immediate confirmation.
      // - One-off payments awaiting capture → DO NOT send confirmation yet. Capture handler will send it.
      if (event.type === "checkout.session.completed" && session.customer_details?.email) {
        const isAuthorizedAwaitingCapture = mode === "payment" && captureStatus === "requires_capture";
        if (!isAuthorizedAwaitingCapture && (paymentStatus === "paid" || mode === "subscription")) {
          await sendOrderConfirmationEmails({
            supabaseUrl,
            serviceRoleKey: supabaseServiceRoleKey,
            session,
            supabase,
            idempotencySuffix: "checkout",
          });
        }
      }
    }

    // ---- Payment intent events (drive capture state machine) ----
    if (
      event.type === "payment_intent.amount_capturable_updated" ||
      event.type === "payment_intent.succeeded" ||
      event.type === "payment_intent.canceled" ||
      event.type === "payment_intent.payment_failed"
    ) {
      const intent = event.data.object as Stripe.PaymentIntent;
      const piMetaSource = typeof intent.metadata?.source === "string" ? intent.metadata.source : null;

      // Find the matching checkout row by payment_intent_id.
      const { data: row } = await supabase
        .from("stripe_checkout_sessions")
        .select("session_id, capture_status, customer_email, amount_total, mode, metadata")
        .eq("payment_intent_id", intent.id)
        .maybeSingle();

      // If we don't have a row yet (race vs checkout.session.completed), bail — the
      // checkout.session.* handler above will pick up the latest PI status.
      if (!row) {
        // Skip non-pixcellor PIs to avoid touching another app's data.
        if (piMetaSource && piMetaSource !== "pixcellor_site") {
          return new Response(JSON.stringify({ received: true, skipped: "non_pixcellor_pi" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ received: true, skipped: "no_session_row" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const update: Record<string, unknown> = {};
      let shouldSendConfirmation = false;

      if (event.type === "payment_intent.amount_capturable_updated" || intent.status === "requires_capture") {
        update.capture_status = "requires_capture";
        update.auth_expires_at = new Date(Date.now() + AUTH_EXPIRY_MS).toISOString();
      }
      if (event.type === "payment_intent.succeeded" || intent.status === "succeeded") {
        update.capture_status = "captured";
        update.captured_at = new Date().toISOString();
        update.payment_status = "paid";
        // Only send the confirmation if we hadn't already (i.e. we were waiting for capture).
        if (row.capture_status === "requires_capture") shouldSendConfirmation = true;
      }
      if (event.type === "payment_intent.canceled" || intent.status === "canceled") {
        update.capture_status = "canceled";
        update.canceled_at = new Date().toISOString();
        if (intent.cancellation_reason) update.cancel_reason = intent.cancellation_reason;
      }
      if (event.type === "payment_intent.payment_failed") {
        update.capture_status = "failed";
      }

      if (Object.keys(update).length > 0) {
        await supabase.from("stripe_checkout_sessions").update(update).eq("session_id", row.session_id);
      }

      if (shouldSendConfirmation) {
        await sendOrderConfirmationEmails({
          supabaseUrl,
          serviceRoleKey: supabaseServiceRoleKey,
          session: {
            id: row.session_id,
            customer_details: { email: row.customer_email },
            amount_total: row.amount_total,
            mode: row.mode,
            metadata: (row.metadata && typeof row.metadata === "object") ? row.metadata as Record<string, string> : {},
          },
          supabase,
          idempotencySuffix: "captured",
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
