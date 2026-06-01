/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://pixcellor.com";
// Card authorizations expire after ~7 days on most networks. Tracked so we can
// auto-capture or warn before we lose the auth.
const AUTH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

async function logAdminAlert(opts: {
  supabase: ReturnType<typeof createClient>;
  source: string;
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  message?: string;
  context?: Record<string, unknown>;
  emailNotify?: boolean;
  supabaseUrl?: string;
  serviceRoleKey?: string;
}) {
  const { supabase, source, severity, title, message, context, emailNotify, supabaseUrl, serviceRoleKey } = opts;
  try {
    await supabase.from("admin_alerts").insert({
      source,
      severity,
      title,
      message: message ?? null,
      context: context ?? {},
    });
  } catch (err) {
    console.error("[admin_alerts insert failed]", err);
  }
  if (emailNotify && supabaseUrl && serviceRoleKey) {
    try {
      const lines = [
        `Severity: ${severity.toUpperCase()}`,
        `Source: ${source}`,
        message ? `\n${message}` : "",
        context ? `\nContext:\n${JSON.stringify(context, null, 2)}` : "",
      ].filter(Boolean).join("\n");
      await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateName: "internal-new-order-notification",
          recipientEmail: "projects@pixcellor.com",
          idempotencyKey: `admin-alert-${source}-${title}-${Date.now()}`.slice(0, 120),
          templateData: {
            orderId: title,
            packageName: `[ALERT] ${title}`,
            customerEmail: (context as any)?.customer_email || "n/a",
            amount: (context as any)?.amount || "",
            billing: severity,
            requirementsUrl: "https://pixcellor.com/admin",
            extraNote: lines,
          },
        }),
      });
    } catch (err) {
      console.error("[admin_alerts email failed]", err);
    }
  }
}

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
      idempotencyKey: `order-confirmation-${session.id}`,
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

      const meta = (session.metadata ?? {}) as Record<string, string>;
      const domainToRegister = (meta.domain_to_register ?? "").trim().toLowerCase() || null;
      const domainTopUpRaw = Number(meta.domain_top_up_gbp ?? "");
      const domainTopUpGbp = Number.isFinite(domainTopUpRaw) && domainTopUpRaw > 0 ? domainTopUpRaw : null;

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
          domain: domainToRegister,
          domain_top_up_gbp: domainTopUpGbp,
          domain_status: domainToRegister ? "pending" : null,
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

      // Fire-and-forget domain registration on completed checkouts.
      // We register on authorization (not capture) so the buyer's domain is locked in immediately.
      // Risk window is small (~7d auth) and worst case admin eats the domain cost.
      if (event.type === "checkout.session.completed" && domainToRegister) {
        try {
          fetch(`${supabaseUrl}/functions/v1/register-domain`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceRoleKey}`,
              "apikey": supabaseServiceRoleKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionId: session.id }),
          }).catch((err) => console.error("[register-domain invoke failed]", err));
        } catch (err) {
          console.error("[register-domain invoke threw]", err);
        }
      }

      // Auto-merge with a matching admin manual draft (same email + amount)
      let mergedIntoManualId: string | null = null;
      if (event.type === "checkout.session.completed" && paymentStatus === "paid") {
        try {
          const { data: matchedId } = await supabase.rpc("match_manual_order_to_stripe", {
            _real_session_id: session.id,
          });
          if (typeof matchedId === "string" && matchedId.length > 0) {
            mergedIntoManualId = matchedId;
            console.log("Merged Stripe session into manual order", { stripe: session.id, manual: matchedId });
          }
        } catch (err) {
          console.error("match_manual_order_to_stripe failed", err);
        }
      }

      // Mark custom admin payment links as paid
      if (event.type === "checkout.session.completed" && paymentStatus === "paid") {
        const meta = (session.metadata as Record<string, string> | null) ?? {};
        const customLinkId = meta.custom_link_id;
        if (customLinkId) {
          try {
            await supabase
              .from("custom_payment_links")
              .update({
                status: "paid",
                paid_session_id: session.id,
                paid_at: new Date().toISOString(),
              })
              .eq("id", customLinkId);
          } catch (err) {
            console.error("Failed to mark custom payment link paid", err);
          }
        }
        const attachedSessionId = meta.attached_session_id;
        if (attachedSessionId) {
          try {
            const { data: existing } = await supabase
              .from("stripe_checkout_sessions")
              .select("metadata")
              .eq("session_id", attachedSessionId)
              .maybeSingle();
            const existingMeta = (existing?.metadata as Record<string, unknown> | null) ?? {};
            await supabase
              .from("stripe_checkout_sessions")
              .update({
                payment_status: "paid",
                status: "complete",
                capture_status: "link",
                captured_at: new Date().toISOString(),
                metadata: {
                  ...existingMeta,
                  paid_via_link_session_id: session.id,
                },
              })
              .eq("session_id", attachedSessionId);
          } catch (err) {
            console.error("Failed to mark attached manual session paid", err);
          }
        }
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
      if (event.type === "checkout.session.completed" && session.customer_details?.email && !mergedIntoManualId) {
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

    // ---- Charge refunded ----
    if (event.type === "charge.refunded" || event.type === "refund.created" || event.type === "refund.updated") {
      const charge = event.type === "charge.refunded"
        ? (event.data.object as Stripe.Charge)
        : null;
      const refund = event.type !== "charge.refunded" ? (event.data.object as Stripe.Refund) : null;
      const piId = charge?.payment_intent as string | null
        ?? (refund?.payment_intent as string | null)
        ?? null;

      if (piId) {
        const { data: row } = await supabase
          .from("stripe_checkout_sessions")
          .select("session_id, customer_email, amount_total, metadata")
          .eq("payment_intent_id", piId)
          .maybeSingle();

        const refundedAmount = charge?.amount_refunded ?? refund?.amount ?? null;
        const refundReason = (refund?.reason as string | null) ?? (charge?.refunds?.data?.[0]?.reason as string | null) ?? null;

        if (row) {
          await supabase.from("stripe_checkout_sessions").update({
            refunded_at: new Date().toISOString(),
            refunded_amount: refundedAmount,
            refund_reason: refundReason,
            order_status: "refunded",
          }).eq("session_id", row.session_id);

          // Demote contact from gold → cool with note
          if (row.customer_email) {
            try {
              const { data: contact } = await supabase.from("contacts").select("id, notes").ilike("email", row.customer_email).maybeSingle();
              if (contact?.id) {
                const note = `${contact.notes ? contact.notes + "\n" : ""}Refunded ${formatGBP(refundedAmount) ?? ""}${refundReason ? ` — ${refundReason}` : ""} (${row.session_id})`;
                await supabase.from("contacts").update({ status: "cool", notes: note, updated_at: new Date().toISOString() }).eq("id", contact.id);
              }
            } catch (err) { console.error("Failed to demote contact on refund", err); }
          }
        }

        await logAdminAlert({
          supabase,
          source: "stripe.refund",
          severity: "warning",
          title: `Refund issued${refundedAmount ? ` ${formatGBP(refundedAmount)}` : ""}`,
          message: `Customer ${row?.customer_email ?? "unknown"} was refunded${refundReason ? ` — reason: ${refundReason}` : ""}.`,
          context: { session_id: row?.session_id, payment_intent: piId, amount: formatGBP(refundedAmount), reason: refundReason, customer_email: row?.customer_email },
          emailNotify: true,
          supabaseUrl,
          serviceRoleKey: supabaseServiceRoleKey,
        });
      }
    }

    // ---- Disputes (chargebacks) — notify immediately ----
    if (
      event.type === "charge.dispute.created" ||
      event.type === "charge.dispute.updated" ||
      event.type === "charge.dispute.closed" ||
      event.type === "charge.dispute.funds_withdrawn" ||
      event.type === "charge.dispute.funds_reinstated"
    ) {
      const dispute = event.data.object as Stripe.Dispute;
      const piId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : null;

      let row: { session_id: string; customer_email: string | null } | null = null;
      if (piId) {
        const { data } = await supabase
          .from("stripe_checkout_sessions")
          .select("session_id, customer_email")
          .eq("payment_intent_id", piId)
          .maybeSingle();
        row = data as any;
      }

      if (row) {
        await supabase.from("stripe_checkout_sessions").update({
          dispute_id: dispute.id,
          dispute_status: dispute.status,
          dispute_reason: dispute.reason,
          dispute_amount: dispute.amount,
          disputed_at: new Date().toISOString(),
        }).eq("session_id", row.session_id);
      }

      const isNewOrLost = event.type === "charge.dispute.created" || dispute.status === "lost" || dispute.status === "needs_response";

      await logAdminAlert({
        supabase,
        source: "stripe.dispute",
        severity: isNewOrLost ? "critical" : "warning",
        title: `Dispute ${dispute.status}: ${formatGBP(dispute.amount) ?? ""}`,
        message: `Reason: ${dispute.reason}. Customer: ${row?.customer_email ?? "unknown"}. Respond in Stripe dashboard ASAP.`,
        context: {
          dispute_id: dispute.id,
          status: dispute.status,
          reason: dispute.reason,
          amount: formatGBP(dispute.amount),
          payment_intent: piId,
          session_id: row?.session_id,
          customer_email: row?.customer_email,
          evidence_due_by: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString() : null,
        },
        emailNotify: true,
        supabaseUrl,
        serviceRoleKey: supabaseServiceRoleKey,
      });
    }

    // ---- Payment failed (top-level alert) ----
    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const err = intent.last_payment_error;
      await logAdminAlert({
        supabase,
        source: "stripe.payment_failed",
        severity: "warning",
        title: `Payment failed${intent.amount ? ` ${formatGBP(intent.amount)}` : ""}`,
        message: err?.message ?? "Payment intent failed",
        context: {
          payment_intent: intent.id,
          code: err?.code,
          decline_code: err?.decline_code,
          amount: formatGBP(intent.amount),
          customer_email: intent.receipt_email,
        },
        emailNotify: false,
        supabaseUrl,
        serviceRoleKey: supabaseServiceRoleKey,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    // Best-effort log — don't throw from inside the catch.
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseServiceRoleKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        await logAdminAlert({
          supabase,
          source: "stripe-webhook",
          severity: "error",
          title: "Webhook processing failed",
          message,
          context: { stack: error instanceof Error ? error.stack : null },
        });
      }
    } catch (_) { /* swallow */ }
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
