/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://pixcellor.com";
// Card authorizations expire after ~7 days on most networks. Tracked so we can
// auto-capture or warn before we lose the auth.
const AUTH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Map Stripe price IDs → internal subscription tier key.
// Keep in sync with src/components/PackagesDialog.tsx RETAINER_TIERS.
const PRICE_TO_TIER: Record<string, { tier: "growth" | "scale" | "enterprise"; displayName: string; interval: "monthly" | "yearly" }> = {
  // Growth
  "price_1TcfyPBtUjwejeUwJmEbSWtN": { tier: "growth", displayName: "Growth", interval: "monthly" },
  "price_1Tcg03BtUjwejeUwr7mYzuUb": { tier: "growth", displayName: "Growth", interval: "yearly" },
  // Scale
  "price_1Tcg07BtUjwejeUwfGGDhftV": { tier: "scale", displayName: "Scale", interval: "monthly" },
  "price_1Tcg0ABtUjwejeUwLc5nw8nX": { tier: "scale", displayName: "Scale", interval: "yearly" },
  // Enterprise (also the legacy Custom retainer)
  "price_1TSmB8BtUjwejeUw8UXRTbBQ": { tier: "enterprise", displayName: "Enterprise", interval: "monthly" },
  "price_1TSmBtBtUjwejeUwb8xPSvvf": { tier: "enterprise", displayName: "Enterprise", interval: "yearly" },
};

const resolveTierFromPriceId = (priceId?: string | null) => {
  if (!priceId) return null;
  return PRICE_TO_TIER[priceId] ?? null;
};

const formatDateGB = (epochSeconds?: number | null) => {
  if (!epochSeconds) return undefined;
  try {
    return new Date(epochSeconds * 1000).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return undefined; }
};

const formatIntervalLabel = (interval?: string | null, count?: number | null) => {
  if (!interval) return undefined;
  const i = interval.toLowerCase();
  if (count && count > 1) return `Every ${count} ${i}s`;
  if (i === "month") return "Monthly";
  if (i === "year") return "Yearly";
  if (i === "week") return "Weekly";
  if (i === "day") return "Daily";
  return interval;
};


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
  // Read package_name from our DB row first (source of truth — admins can edit it),
  // then fall back to Stripe session metadata, then to "Full Works".
  const { data: dbRow } = await supabase
    .from("stripe_checkout_sessions")
    .select("metadata")
    .eq("session_id", session.id)
    .maybeSingle();
  const dbMeta = (dbRow?.metadata && typeof dbRow.metadata === "object") ? dbRow.metadata as Record<string, unknown> : {};
  const packageName =
    (typeof dbMeta.package_name === "string" && dbMeta.package_name) ||
    session.metadata?.package_name ||
    "Full Works";
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
      idempotencyKey: `internal-order-notification-${session.id}`,
      templateData,
    }),
  });
}

// Persist/upsert the subscription row from a Stripe.Subscription.
async function upsertSubscriptionRow(opts: {
  supabase: ReturnType<typeof createClient>;
  subscription: Stripe.Subscription;
  customerEmail?: string | null;
}) {
  const { supabase, subscription, customerEmail } = opts;
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const tierInfo = resolveTierFromPriceId(priceId);
  // In Stripe API 2025-08-27.basil, current_period_start/end moved from the
  // Subscription onto the SubscriptionItem. Read item first, fall back to
  // subscription for older payloads/legacy events.
  const periodStart = ((item as any)?.current_period_start ?? (subscription as any).current_period_start) as number | undefined;
  const periodEnd = ((item as any)?.current_period_end ?? (subscription as any).current_period_end) as number | undefined;
  const canceledAt = (subscription as any).canceled_at as number | undefined;
  const endedAt = (subscription as any).ended_at as number | undefined;
  const interval = item?.price?.recurring?.interval ?? null;
  const intervalCount = item?.price?.recurring?.interval_count ?? null;

  await supabase.from("subscriptions").upsert({
    subscription_id: subscription.id,
    customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
    customer_email: customerEmail ?? null,
    tier: tierInfo?.tier ?? null,
    price_id: priceId,
    status: subscription.status,
    billing_interval: formatIntervalLabel(interval, intervalCount) ?? null,
    amount_total: item?.price?.unit_amount ?? null,
    currency: item?.price?.currency ?? null,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    canceled_at: canceledAt ? new Date(canceledAt * 1000).toISOString() : null,
    ended_at: endedAt ? new Date(endedAt * 1000).toISOString() : null,
    metadata: (subscription.metadata as Record<string, unknown>) ?? {},
    updated_at: new Date().toISOString(),
  }, { onConflict: "subscription_id" });
}

async function sendSubscriptionWelcomeEmails(opts: {
  supabaseUrl: string;
  serviceRoleKey: string;
  supabase: ReturnType<typeof createClient>;
  stripe: Stripe;
  session: Stripe.Checkout.Session;
}) {
  const { supabaseUrl, serviceRoleKey, supabase, stripe, session } = opts;
  const email = session.customer_details?.email;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  if (!email || !subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionRow({ supabase, subscription, customerEmail: email });

  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const tierInfo = resolveTierFromPriceId(priceId);
  if (!tierInfo) {
    console.warn("[subscription-welcome] Unknown price id, skipping tier-specific email", { priceId, subscriptionId });
    return;
  }
  const tierKey = tierInfo.tier;
  const tierDisplay = tierInfo.displayName;
  const intervalLabel = formatIntervalLabel(item?.price?.recurring?.interval, item?.price?.recurring?.interval_count);
  const amountFormatted = formatGBP(item?.price?.unit_amount ?? null);
  const periodEnd = ((item as any)?.current_period_end ?? (subscription as any).current_period_end) as number | undefined;

  const templateData = {
    customerEmail: email,
    subscriptionId,
    tierName: tierDisplay,
    amount: amountFormatted,
    billingInterval: intervalLabel,
    nextRenewalDate: formatDateGB(periodEnd),
    portalUrl: `${SITE_URL}/portal`,
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
      templateName: `subscription-welcome-${tierKey}`,
      recipientEmail: email,
      idempotencyKey: `subscription-welcome-${subscriptionId}`,
      templateData,
    }),
  });

  await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: emailHeaders,
    body: JSON.stringify({
      templateName: "internal-new-order-notification",
      recipientEmail: "projects@pixcellor.com",
      idempotencyKey: `internal-subscription-notification-${subscriptionId}`,
      templateData: {
        ...templateData,
        orderId: subscriptionId,
        packageName: `${tierDisplay} Retainer (${intervalLabel || "subscription"})`,
        billing: intervalLabel || "subscription",
        requirementsUrl: `${SITE_URL}/portal`,
      },
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
        if (mode === "subscription") {
          // Route subscriptions to the tier-aware welcome email (Growth/Scale/Enterprise).
          try {
            await sendSubscriptionWelcomeEmails({
              supabaseUrl,
              serviceRoleKey: supabaseServiceRoleKey,
              supabase,
              stripe,
              session,
            });
          } catch (err) {
            console.error("sendSubscriptionWelcomeEmails failed", err);
          }
        } else if (!isAuthorizedAwaitingCapture && paymentStatus === "paid") {
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

    // ---- Subscription lifecycle: renewals, failed payments, cancellations, tier changes ----
    const isPixcellorSub = (metadata: Stripe.Metadata | null | undefined) =>
      typeof metadata?.source === "string"
        ? metadata.source === "pixcellor_site"
        : true; // when metadata.source is absent (legacy subs) we still treat it as ours.

    const emailHeadersV2 = {
      "Authorization": `Bearer ${supabaseServiceRoleKey}`,
      "apikey": supabaseServiceRoleKey,
      "Content-Type": "application/json",
    };
    const invokeEmail = (body: Record<string, unknown>) =>
      fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: emailHeadersV2,
        body: JSON.stringify(body),
      }).catch((err) => console.error("[send-transactional-email failed]", err));

    // -- invoice.payment_succeeded → renewal receipt --
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof (invoice as any).subscription === "string" ? (invoice as any).subscription : null;
      // billing_reason: subscription_create | subscription_cycle | subscription_update | manual ...
      const billingReason = (invoice as any).billing_reason as string | undefined;
      if (subscriptionId && billingReason !== "subscription_create") {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          if (!isPixcellorSub(subscription.metadata)) {
            return new Response(JSON.stringify({ received: true, skipped: "non_pixcellor_sub" }), { status: 200, headers: { "Content-Type": "application/json" } });
          }
          const email = invoice.customer_email || (typeof subscription.customer === "string" ? null : (subscription.customer as Stripe.Customer)?.email) || null;
          await upsertSubscriptionRow({ supabase, subscription, customerEmail: email });

          if (email) {
            const item = subscription.items?.data?.[0];
            const tierInfo = resolveTierFromPriceId(item?.price?.id ?? null);
            const intervalLabel = formatIntervalLabel(item?.price?.recurring?.interval, item?.price?.recurring?.interval_count);
            const periodEnd = ((item as any)?.current_period_end ?? (subscription as any).current_period_end) as number | undefined;
            await invokeEmail({
              templateName: "subscription-renewal-receipt",
              recipientEmail: email,
              idempotencyKey: `subscription-renewal-${invoice.id}`,
              templateData: {
                customerEmail: email,
                tierName: tierInfo?.displayName ?? "Subscription",
                amount: formatGBP(invoice.amount_paid ?? null),
                billingInterval: intervalLabel,
                invoiceNumber: (invoice.number as string | null) ?? invoice.id,
                invoiceHostedUrl: (invoice.hosted_invoice_url as string | null) ?? undefined,
                invoicePdfUrl: (invoice.invoice_pdf as string | null) ?? undefined,
                nextRenewalDate: formatDateGB(periodEnd),
                portalUrl: `${SITE_URL}/portal`,
              },
            });
          }
        } catch (err) {
          console.error("invoice.payment_succeeded handler failed", err);
        }
      }
    }

    // -- invoice.payment_failed → payment failed email + admin alert --
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof (invoice as any).subscription === "string" ? (invoice as any).subscription : null;
      if (subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          if (!isPixcellorSub(subscription.metadata)) {
            return new Response(JSON.stringify({ received: true, skipped: "non_pixcellor_sub" }), { status: 200, headers: { "Content-Type": "application/json" } });
          }
          const email = invoice.customer_email || null;
          await upsertSubscriptionRow({ supabase, subscription, customerEmail: email });

          const item = subscription.items?.data?.[0];
          const tierInfo = resolveTierFromPriceId(item?.price?.id ?? null);
          const nextAttempt = (invoice as any).next_payment_attempt as number | undefined;

          if (email) {
            await invokeEmail({
              templateName: "subscription-payment-failed",
              recipientEmail: email,
              idempotencyKey: `subscription-payment-failed-${invoice.id}`,
              templateData: {
                customerEmail: email,
                tierName: tierInfo?.displayName ?? "Subscription",
                amount: formatGBP(invoice.amount_due ?? null),
                invoiceHostedUrl: (invoice.hosted_invoice_url as string | null) ?? undefined,
                nextAttemptDate: formatDateGB(nextAttempt),
                portalUrl: `${SITE_URL}/portal`,
              },
            });
          }

          await logAdminAlert({
            supabase,
            source: "stripe.subscription_payment_failed",
            severity: "warning",
            title: `Subscription payment failed — ${tierInfo?.displayName ?? "Subscription"}${invoice.amount_due ? ` ${formatGBP(invoice.amount_due)}` : ""}`,
            message: `Customer ${email ?? "unknown"} — Stripe will retry${nextAttempt ? ` on ${formatDateGB(nextAttempt)}` : ""}.`,
            context: { subscription_id: subscriptionId, invoice_id: invoice.id, customer_email: email, amount: formatGBP(invoice.amount_due ?? null) },
            emailNotify: true,
            supabaseUrl,
            serviceRoleKey: supabaseServiceRoleKey,
          });
        } catch (err) {
          console.error("invoice.payment_failed handler failed", err);
        }
      }
    }

    // -- customer.subscription.updated → tier change emails (only when price changed) --
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const previous = (event.data.previous_attributes ?? {}) as Partial<Stripe.Subscription>;
      if (isPixcellorSub(subscription.metadata)) {
        try {
          // Pull current customer email (subscription doesn't always carry it).
          const customer = typeof subscription.customer === "string"
            ? (await stripe.customers.retrieve(subscription.customer)) as Stripe.Customer
            : (subscription.customer as Stripe.Customer);
          const email = (customer && !customer.deleted) ? customer.email : null;

          // Snapshot previous DB row BEFORE upserting so we can diff against
          // what we last saw (more reliable than Stripe previous_attributes
          // which only contains changed top-level fields).
          const { data: priorRow } = await supabase
            .from("subscriptions")
            .select("price_id, status, cancel_at_period_end")
            .eq("subscription_id", subscription.id)
            .maybeSingle();

          await upsertSubscriptionRow({ supabase, subscription, customerEmail: email });

          const prevItems = (previous as any).items?.data as Stripe.SubscriptionItem[] | undefined;
          const prevPriceFromEvent = prevItems?.[0]?.price?.id ?? null;
          const prevPriceFromDb = (priorRow as any)?.price_id ?? null;
          const prevPriceId = prevPriceFromEvent ?? prevPriceFromDb ?? null;
          const newItem = subscription.items?.data?.[0];
          const newPriceId = newItem?.price?.id ?? null;
          const priceChanged = prevPriceId && newPriceId && prevPriceId !== newPriceId;

          if (priceChanged && email) {
            const prevTier = resolveTierFromPriceId(prevPriceId);
            const newTier = resolveTierFromPriceId(newPriceId);
            const tierOrder = { growth: 1, scale: 2, enterprise: 3 } as const;
            const changeKind = prevTier && newTier
              ? (tierOrder[newTier.tier] > tierOrder[prevTier.tier] ? "upgrade" : tierOrder[newTier.tier] < tierOrder[prevTier.tier] ? "downgrade" : "change")
              : "change";
            const intervalLabel = formatIntervalLabel(newItem?.price?.recurring?.interval, newItem?.price?.recurring?.interval_count);
            await invokeEmail({
              templateName: "subscription-tier-changed",
              recipientEmail: email,
              idempotencyKey: `subscription-tier-changed-${subscription.id}-${newPriceId}`,
              templateData: {
                customerEmail: email,
                previousTier: prevTier?.displayName ?? "Previous plan",
                newTier: newTier?.displayName ?? "New plan",
                newAmount: formatGBP(newItem?.price?.unit_amount ?? null),
                billingInterval: intervalLabel,
                effectiveDate: formatDateGB(Math.floor(Date.now() / 1000)),
                portalUrl: `${SITE_URL}/portal`,
                changeKind,
              },
            });
          }

          // Detect customer-initiated cancellation scheduled at period end
          // (cancel_at_period_end flipped false→true). Send acknowledgement
          // immediately — the final subscription-cancelled email won't fire
          // until the period actually ends via customer.subscription.deleted.
          const cancelScheduled =
            (previous as any).cancel_at_period_end === false &&
            subscription.cancel_at_period_end === true;
          if (cancelScheduled && email) {
            const tierInfo = resolveTierFromPriceId(newPriceId);
            const periodEnd = ((newItem as any)?.current_period_end ?? (subscription as any).current_period_end) as number | undefined;
            await invokeEmail({
              templateName: "subscription-cancelled",
              recipientEmail: email,
              idempotencyKey: `subscription-cancel-scheduled-${subscription.id}-${periodEnd ?? "x"}`,
              templateData: {
                customerEmail: email,
                tierName: tierInfo?.displayName ?? "Subscription",
                endDate: formatDateGB(periodEnd),
                reactivateUrl: `${SITE_URL}/portal`,
              },
            });
            await logAdminAlert({
              supabase,
              source: "stripe.subscription_cancel_scheduled",
              severity: "warning",
              title: `Cancellation scheduled — ${tierInfo?.displayName ?? "Subscription"}`,
              message: `Customer ${email} scheduled cancellation; access ends ${formatDateGB(periodEnd) ?? "at period end"}.`,
              context: { subscription_id: subscription.id, customer_email: email, period_end: periodEnd },
              emailNotify: true,
              supabaseUrl,
              serviceRoleKey: supabaseServiceRoleKey,
            });
          }

          // Reactivation: cancel_at_period_end flipped true→false
          // (covers Stripe event payload OR DB-tracked previous state).
          const prevCancelFromEvent = (previous as any).cancel_at_period_end;
          const prevCancelFromDb = (priorRow as any)?.cancel_at_period_end ?? false;
          const wasCancelling = prevCancelFromEvent === true || (prevCancelFromEvent === undefined && prevCancelFromDb === true);
          const reactivated = wasCancelling && subscription.cancel_at_period_end === false && subscription.status === "active";
          if (reactivated && email) {
            const tierInfo = resolveTierFromPriceId(newPriceId);
            const periodEnd = ((newItem as any)?.current_period_end ?? (subscription as any).current_period_end) as number | undefined;
            await invokeEmail({
              templateName: "subscription-reactivated",
              recipientEmail: email,
              idempotencyKey: `subscription-reactivated-${subscription.id}-${periodEnd ?? "x"}`,
              templateData: {
                customerEmail: email,
                tierName: tierInfo?.displayName ?? "Subscription",
                nextRenewalDate: formatDateGB(periodEnd),
                portalUrl: `${SITE_URL}/portal`,
              },
            });
          }

          // Status flipped to past_due (outside of invoice events) → admin alert.
          const prevStatus = (previous as any).status ?? (priorRow as any)?.status ?? null;
          if (prevStatus && prevStatus !== "past_due" && subscription.status === "past_due") {
            const tierInfo = resolveTierFromPriceId(newPriceId);
            await logAdminAlert({
              supabase,
              source: "stripe.subscription_past_due",
              severity: "warning",
              title: `Subscription past due — ${tierInfo?.displayName ?? "Subscription"}`,
              message: `Customer ${email ?? "unknown"} subscription is past_due (was ${prevStatus}). Stripe will retry per dunning settings.`,
              context: { subscription_id: subscription.id, customer_email: email, prev_status: prevStatus },
              emailNotify: true,
              supabaseUrl,
              serviceRoleKey: supabaseServiceRoleKey,
            });
          }
        } catch (err) {
          console.error("customer.subscription.updated handler failed", err);
        }
      }
    }

    // -- customer.subscription.deleted → cancellation email + admin alert --
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      if (isPixcellorSub(subscription.metadata)) {
        try {
          const customer = typeof subscription.customer === "string"
            ? (await stripe.customers.retrieve(subscription.customer)) as Stripe.Customer
            : (subscription.customer as Stripe.Customer);
          const email = (customer && !customer.deleted) ? customer.email : null;

          await upsertSubscriptionRow({ supabase, subscription, customerEmail: email });

          const item = subscription.items?.data?.[0];
          const tierInfo = resolveTierFromPriceId(item?.price?.id ?? null);
          const periodEnd = ((item as any)?.current_period_end ?? (subscription as any).current_period_end) as number | undefined;
          const endedAt = (subscription as any).ended_at as number | undefined;
          const endDate = formatDateGB(periodEnd ?? endedAt);

          if (email) {
            await invokeEmail({
              templateName: "subscription-cancelled",
              recipientEmail: email,
              idempotencyKey: `subscription-cancelled-${subscription.id}`,
              templateData: {
                customerEmail: email,
                tierName: tierInfo?.displayName ?? "Subscription",
                endDate,
                reactivateUrl: `${SITE_URL}/portal`,
              },
            });
          }

          await logAdminAlert({
            supabase,
            source: "stripe.subscription_cancelled",
            severity: "warning",
            title: `Subscription cancelled — ${tierInfo?.displayName ?? "Subscription"}`,
            message: `Customer ${email ?? "unknown"} cancelled${endDate ? `; access ends ${endDate}` : ""}.`,
            context: { subscription_id: subscription.id, customer_email: email },
            emailNotify: true,
            supabaseUrl,
            serviceRoleKey: supabaseServiceRoleKey,
          });
        } catch (err) {
          console.error("customer.subscription.deleted handler failed", err);
        }
      }
    }

    // Always keep our subscription row fresh from .created too (covers off-Stripe-Checkout subs).
    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      if (isPixcellorSub(subscription.metadata)) {
        try {
          const customer = typeof subscription.customer === "string"
            ? (await stripe.customers.retrieve(subscription.customer)) as Stripe.Customer
            : (subscription.customer as Stripe.Customer);
          const email = (customer && !customer.deleted) ? customer.email : null;
          await upsertSubscriptionRow({ supabase, subscription, customerEmail: email });
        } catch (err) {
          console.error("customer.subscription.created handler failed", err);
        }
      }
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
