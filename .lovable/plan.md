## Goal

Let admins create orders directly from the Live tab — for offline payments (bank transfer, cash, invoice) or as parked draft quotes — and have an incoming Stripe payment automatically attach itself to a matching draft order.

## UX

**Live tab → new "+ New Order" button** (top right, next to the search). Opens a drawer/dialog with:

- **Customer email** (required)
- **Customer name** (optional; shown in admin views, copied to client_profiles)
- **Package** dropdown:
  - Full Works (£150) / Elite (£500) / Retainer monthly (£X) / Retainer yearly (£X)
  - **Custom…** → reveals two extra fields: custom **label** + custom **amount (GBP)**
- **Order type** (radio):
  - **Paid (offline)** — record as already paid (bank/cash/invoice). Marks `payment_status=paid`, `order_status=open`, `paid_at=now`.
  - **Draft / Quote** — parked, awaiting payment. `payment_status=unpaid`, `order_status=open`, no paid timestamp.
- **Notes / reference** (optional, free text — stored in metadata, e.g. "Bank transfer ref ABC123")
- **Send order confirmation email + requirements link** (checkbox, default **on** for "Paid", off for "Draft")

On submit:
1. Insert a row into `stripe_checkout_sessions` with a synthetic `session_id` like `manual_<uuid>`, the chosen `package_name`, `amount_total` (in pence), `currency=gbp`, `mode=payment`, `metadata` carrying `{ source: "admin_manual", created_by_email, custom_label, notes }`.
2. Generate `order_code` + `requirements_token` via existing `ensure_order_public_reference`.
3. If Paid + email checkbox on → invoke existing `send-order-confirmation` with the session row → customer gets the same branded email + requirements link as a normal Stripe order.
4. Toast success and refresh the snapshot. The new order shows up in the **Live** list immediately.

**Live tab visual difference:** draft/unpaid manual orders get an amber "Draft" badge instead of the green "Live" one, so staff can chase them.

## Auto-match Stripe payment → draft order

When a real Stripe `checkout.session.completed` arrives:

- Existing `stripe-webhook` already upserts a row keyed by Stripe's `session_id`.
- **New step (added inside the webhook):** after upsert, if the Stripe row is `paid`, look for an existing **manual draft** with `metadata->>source = 'admin_manual'`, matching `lower(customer_email)` and matching `amount_total`, that is still `payment_status != 'paid'`. If found:
  - Copy the Stripe `payment_intent_id`, `paid_at`, `customer_id` onto the draft row, set `payment_status='paid'`, append note in metadata: `matched_stripe_session: <real session_id>`.
  - Mark the freshly-inserted Stripe row as `order_status='matched_to_manual'` (or simply delete it) so the order isn't duplicated in Live.
  - Fire `send-order-confirmation` for the now-paid draft if it hadn't already been sent.

This keeps reporting clean: one logical order per customer payment.

## Database

Single migration:

1. Add a SECURITY DEFINER RPC `portal_create_manual_order(_email, _name, _package_name, _amount_pence, _mark_paid, _notes, _custom_label)`:
   - `portal_require_admin()`
   - Validate: email format, amount 1..1_000_000_00 pence, label ≤ 80 chars, notes ≤ 1000 chars.
   - Insert into `stripe_checkout_sessions` with synthetic `session_id = 'manual_' || gen_random_uuid()`, `stripe_event_id = session_id`, `mode='payment'`, `currency='gbp'`, `metadata` JSON.
   - Call `ensure_order_public_reference` to populate `order_code` + `requirements_token`.
   - Returns the new row as jsonb (so the client can immediately invoke `send-order-confirmation`).

2. Add a SECURITY DEFINER RPC `match_manual_order_to_stripe(_real_session_id text)` used by the webhook (service role) — encapsulates the lookup + merge logic above and returns the matched manual `session_id` (or null).

3. Update `portal_fetch_snapshot` — no change needed, it already returns all stripe_checkout_sessions rows.

## Frontend

- New file `src/components/portal/NewOrderDialog.tsx` — the form/drawer described above. Reuses `Input`, `Select`, `RadioGroup`, `Switch`, `Button` from shadcn.
- `Portal.tsx` Live tab header: add "+ New Order" button that opens the dialog. After success, calls existing `loadPortalSnapshot()`.
- Live order rows: when `metadata.source === 'admin_manual'` and `payment_status !== 'paid'`, render an amber "Draft" badge instead of the green "Live"/"Delivered" badges.

## Edge function changes

- `supabase/functions/stripe-webhook/index.ts`: after the existing successful-payment upsert (around line 240–250), call the new `match_manual_order_to_stripe` RPC with the Stripe `session_id`. If it returns a manual `session_id`, optionally call `send-order-confirmation` for that manual id (only if it hadn't been sent on creation).
- No new edge function required for creating the order — frontend hits the RPC directly via `supabase.rpc('portal_create_manual_order', …)`, then invokes the existing `send-order-confirmation` function.

## Out of scope

- Generating Stripe payment links from the admin (not needed per your answers).
- Subscription (retainer) draft handling for partial payments — manual retainer orders are recorded as one-off paid for now; if you later want recurring tracking we can extend.

## Risks / notes

- Auto-match is **email + exact amount**. If a customer pays a different amount than the draft, no match — the Stripe order shows up separately and the draft stays parked. Staff can manually merge by deleting the draft.
- Synthetic `session_id` prefixed `manual_` keeps it clearly distinct in the DB and in Stripe-derived URLs (e.g. requirements link still works because it uses `requirements_token`, not the session id).
