## Problem

Pixcellor and your other app share the same Stripe account, which means they share the same webhook endpoint. Right now `supabase/functions/stripe-webhook/index.ts` sends a Pixcellor-branded confirmation email (and an internal notification to `projects@pixcellor.com`) for **every** `checkout.session.completed` event Stripe delivers — including checkouts created by your other app. That's why your other app's customer received a Pixcellor email.

## Fix

Pixcellor checkouts are already tagged. In `create-checkout/index.ts` every session is created with `metadata.source = "pixcellor_site"`. We'll use that tag as the gate.

### Changes to `supabase/functions/stripe-webhook/index.ts`

1. **Source check before any Pixcellor-specific work.** Read `session.metadata?.source` and treat the event as Pixcellor only when it equals `"pixcellor_site"`.
2. **Skip non-Pixcellor sessions early.** If the source doesn't match:
   - Do **not** upsert into `stripe_checkout_sessions` (that table is Pixcellor's order ledger).
   - Do **not** call `ensure_order_public_reference`.
   - Do **not** send the customer confirmation email.
   - Do **not** send the internal `projects@pixcellor.com` notification.
   - Still return `200` so Stripe stops retrying, and still log the raw event into `stripe_events` (harmless, useful for debugging).
3. **Defensive fallback.** If `metadata.source` is missing entirely (e.g. a very old Pixcellor session pre-tagging), also skip — better to miss one edge case than to spam another app's customers. All current Pixcellor checkouts set this tag, so live traffic is unaffected.

### What stays the same

- `create-checkout` already sets the tag — no change needed there.
- `check-order-status`, `send-order-confirmation` (manual admin resend), and the rest of the order pipeline are unaffected; they only ever operate on rows already in `stripe_checkout_sessions`, which will now only contain Pixcellor orders going forward.
- Auth emails, transactional infra, and templates are untouched.

### Result

- Other app's checkouts → webhook acknowledges them, logs the raw event, sends nothing, writes nothing to Pixcellor's order tables.
- Pixcellor checkouts → behave exactly as today (confirmation email to customer + internal notification + order row).