## Goal

Build a proper email lifecycle for the new monthly/yearly retainer tiers (Growth £100, Scale £500, Enterprise £2,500) so subscribers get the right email at every key moment — not just the existing generic "Retainer" one-off confirmation.

## What exists today

- One template `retainer-order-confirmation` is sent once on `checkout.session.completed` for any subscription.
- It's generic ("Retainer"), uses the one-off order layout, and pushes the project-requirements form — wrong tone for an ongoing monthly subscription.
- No webhook handlers for `invoice.payment_succeeded` (renewals), `invoice.payment_failed`, `customer.subscription.updated` (tier change), or `customer.subscription.deleted` (cancellation).
- No tier detection — Growth/Scale/Enterprise are indistinguishable downstream.

## What we'll build

### 1. Tier-aware templates (4 new + 1 rework)

Each tier has different value, so each gets its own onboarding email. Renewals/failures/cancellations are shared across tiers (the tier name is just a variable).

| Template | When sent | Trigger |
|---|---|---|
| `subscription-welcome-growth` | First payment of Growth | `checkout.session.completed` (mode=subscription) |
| `subscription-welcome-scale` | First payment of Scale | same |
| `subscription-welcome-enterprise` | First payment of Enterprise | same |
| `subscription-renewal-receipt` | Each recurring charge | `invoice.payment_succeeded` (billing_reason ≠ subscription_create) |
| `subscription-payment-failed` | Card declined | `invoice.payment_failed` |
| `subscription-cancelled` | Sub ends | `customer.subscription.deleted` |
| `subscription-tier-changed` | Upgrade/downgrade | `customer.subscription.updated` (price change) |

Welcome emails per tier reflect what the customer actually unlocked (the feature lists from `RETAINER_TIERS`), point them to portal/login, set expectations for what happens next (kickoff call, onboarding form, account manager, etc.), and explain billing cadence. They drop the "add project requirements" CTA for tiers where it doesn't fit.

The existing `retainer-order-confirmation` is kept but only used for the legacy `price_1TSmB8...` Custom/Enterprise retainer for back-compat. New tiers route to the new templates.

### 2. Tier resolver

A shared mapping (priceId → tier key) lives in `stripe-webhook` so we can look up the tier from `subscription.items[0].price.id`. Tier key determines which welcome template to send and is also passed to all subscription emails as `templateData.tierName`.

### 3. Stripe webhook additions

Extend `supabase/functions/stripe-webhook/index.ts`:

- On `checkout.session.completed` with `mode === "subscription"`: retrieve the subscription, resolve the tier, send the matching `subscription-welcome-<tier>` instead of the generic retainer email. Idempotency key: `subscription-welcome-${subscription_id}`.
- New handlers for `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated` — gated on the existing `pixcellor_site` source check (read from subscription metadata; we'll set it on creation).
- Renewal idempotency key: `subscription-renewal-${invoice.id}` (Stripe invoice IDs are unique per cycle, so this naturally dedupes the duplicate-webhook problem we just fixed).
- All new handlers go through `send-transactional-email` (which already dedupes against `email_send_log`).

### 4. Subscriptions table

New `public.subscriptions` table to track current state per customer (subscription_id, customer_email, tier, status, current_period_end, cancel_at_period_end, price_id). Upserted from every subscription webhook. Used by:
- Customer Portal — show current plan + renewal date.
- Internal admin alerts — failed payments, cancellations.
- Future logic (gating features by tier).

### 5. Internal notifications

Re-use `internal-new-order-notification` for new subscriptions (with tier in the subject). Add a lightweight admin alert email for `invoice.payment_failed` and `customer.subscription.deleted` so we can intervene.

### 6. Make sure metadata is set on subscription creation

Update `create-checkout` to pass `source: pixcellor_site` and `tier: <key>` into `subscription_data.metadata` (not just session metadata) so all downstream invoice/subscription webhooks can identify Pixcellor subs.

## Technical notes

- All new templates follow the existing dark-shell Pixcellor design (matches `retainer-order-confirmation.tsx`).
- Renewal receipts include amount, period end, invoice URL (`invoice.hosted_invoice_url`), and a "Manage subscription" link to a Stripe billing portal session — we'll add a `create-billing-portal` edge function for the portal link.
- Payment-failed email includes the `invoice.hosted_invoice_url` so the customer can update their card directly.
- Cancellation email confirms access until `current_period_end` and offers a "reactivate" CTA.
- All sends use idempotency keys derived from Stripe object IDs (invoice id / subscription id) → no duplicates even on webhook redelivery.

## Files touched

- New: 6 templates in `supabase/functions/_shared/transactional-email-templates/`
- New: `supabase/functions/create-billing-portal/index.ts`
- Edit: `supabase/functions/_shared/transactional-email-templates/registry.ts` (register new templates)
- Edit: `supabase/functions/stripe-webhook/index.ts` (tier resolver + 4 new event handlers)
- Edit: `supabase/functions/create-checkout/index.ts` (subscription_data.metadata)
- New migration: `public.subscriptions` table with RLS + GRANTs
- Edit: `src/pages/CustomerPortal.tsx` — show current subscription tier + renewal date + manage-billing button (optional, can be a follow-up)

## Out of scope (flagging now)

- Dunning sequences (multiple reminder emails after failed payment). Stripe Smart Retries handles retry attempts; we send one email per failed invoice.
- Trial-end emails (no trials configured today).
- Marketing/nurture sequences — blocked by transactional rules anyway.

Confirm and I'll build it.
