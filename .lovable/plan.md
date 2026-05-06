# Switch to Authorize & Capture (avoid refund fees)

## Why
Stripe keeps the 20p–30p processing fee on every refund. If we **authorize** the card at checkout but only **capture** once we've reviewed/accepted the order, cancelling an authorization costs nothing — no fee lost, no refund needed.

## Important constraints
- **Manual capture only works on one-off card payments** (`mode: "payment"`). Stripe does **not** allow manual capture on subscriptions, so the **Elite retainer / £150/yr renewal subscriptions stay as today** (immediate charge). Only **Full Works one-time** and any other one-off price will become auth-only.
- Card authorizations expire after **~7 days** (some cards 5). If we don't capture in time the auth drops off and we lose the money. We need an admin UI + a safety auto-capture.
- Wallets (Apple/Google Pay/Link) sometimes fall back to immediate capture — we'll surface the real PI status from Stripe so the dashboard never lies.

## Changes

### 1. `create-checkout` edge function
- For `mode === "payment"` add:
  ```ts
  payment_intent_data: {
    capture_method: "manual",
    description: `Pixcellor – ${packageName}`,
  }
  ```
- Subscriptions untouched.

### 2. `stripe-webhook`
- Keep handling `checkout.session.completed`, but treat `payment_status === "paid"` on a manual-capture PI as **authorized, not paid**. Look up the PI (`stripe.paymentIntents.retrieve(session.payment_intent)`) and store its `status` (`requires_capture`, `succeeded`, `canceled`).
- New columns on `stripe_checkout_sessions`:
  - `payment_intent_id text`
  - `capture_status text` (`requires_capture` | `captured` | `canceled` | `expired` | `n/a`)
  - `auth_expires_at timestamptz` (now + 7 days when first authorized)
  - `captured_at timestamptz`
- Also subscribe to `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.canceled`, `payment_intent.payment_failed` and update the row.
- Email logic split:
  - **On authorization** → send a new "Order received – pending review" email (no requirements link yet, or soft link).
  - **On capture** → send the existing order-confirmation + internal-new-order emails (move the current block out of the webhook into the capture handler).

### 3. New edge functions (admin only, JWT + `has_role(admin)`)
- `capture-payment` — body `{ session_id }`, calls `stripe.paymentIntents.capture(pi)`, updates row, triggers confirmation emails.
- `cancel-authorization` — body `{ session_id, reason? }`, calls `stripe.paymentIntents.cancel(pi, { cancellation_reason })`, updates row, sends "order cancelled, no charge taken" email to customer.
- `auto-capture-expiring` — scheduled (cron every 6h): finds rows with `capture_status='requires_capture'` and `auth_expires_at < now()+24h`, captures them automatically so we don't lose the auth. Logs to a small audit table.

### 4. Admin UI (`src/pages/Admin.tsx`)
New "Pending authorizations" panel showing rows where `capture_status='requires_capture'`:
- Customer email, package, amount, time since auth, **time left before auth expires** (red < 24h).
- Buttons: **Capture** / **Cancel (no fee)**. Both confirm via dialog.
- Filter tab on existing orders list: All / Authorized / Captured / Cancelled.

### 5. Customer-facing copy updates
- `OrderSuccess.tsx` and `check-order-status`: when `capture_status==='requires_capture'` show "Your card is authorised — we'll confirm and charge once we review your brief (usually within 24h). No charge yet." instead of "Payment received".
- Update Legal/Terms wording to mention authorize-and-capture and the up-to-7-day auth window.

### 6. DB migration
```sql
alter table public.stripe_checkout_sessions
  add column if not exists payment_intent_id text,
  add column if not exists capture_status text,
  add column if not exists auth_expires_at timestamptz,
  add column if not exists captured_at timestamptz;

create index if not exists idx_scs_capture_status
  on public.stripe_checkout_sessions(capture_status)
  where capture_status = 'requires_capture';
```
Plus `supabase/config.toml` entries for the 3 new functions and a pg_cron schedule for `auto-capture-expiring`.

### 7. Stripe dashboard side (manual, you do once)
Add the new event types to the webhook endpoint:
`payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.canceled`, `payment_intent.payment_failed`.

## Out of scope / call-outs
- Subscriptions can't be auth-only — refunds on Elite renewals still incur fees. Mitigation = strong dunning/cancellation flow, not part of this change.
- Apple Pay / Link occasionally ignore manual capture; UI handles by showing real PI status.
- 3DS-required cards: capture must happen within auth window even if customer SCAs at auth time — auto-capture cron covers this.

Approve and I'll implement steps 1–6 (you'll handle step 7 in the Stripe dashboard, which I'll walk you through).