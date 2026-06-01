## Goal

Surface the customer's live Stripe subscription state (tier, status, next renewal, cancel-at-period-end) in the Payments tab of the Customer Portal, and add a "Manage billing" button that opens the Stripe Customer Portal via the existing `create-billing-portal` edge function.

## Scope

Frontend-only edit to `src/pages/CustomerPortal.tsx`. No schema, RPC, or edge function changes — the `subscriptions` table already exists with an RLS policy allowing customers to read their own row (by email), and `create-billing-portal` is already deployed.

## Changes

### 1. Fetch live subscription
- Add a `subscription` state typed against `Tables<"subscriptions">`.
- Inside `loadPortal`, in parallel with the existing calls, query:
  ```ts
  supabase.from("subscriptions")
    .select("*")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle()
  ```
  RLS already scopes it to the signed-in customer.

### 2. Replace the "Current plan" card
Instead of deriving from the latest legacy retainer order, drive the card from the live `subscription` row when present (fall back to the existing legacy retainer view if no row exists, so old £2,500 retainer customers still see something).

Show:
- **Plan** — title-cased `subscription.tier` (Growth / Scale / Enterprise) with the monthly/yearly price from `amount_total` + `currency` + `billing_interval`.
- **Status** — badge from `subscription.status` (`active`, `past_due`, `canceled`, `trialing`) with appropriate color.
- **Next renewal** — `current_period_end` formatted as a date.
- **Cancel notice** — if `cancel_at_period_end === true`, show a muted "Cancels on <date>" line.

### 3. "Manage billing" button
Add a primary button in the Current plan card:
```ts
const { data, error } = await supabase.functions.invoke("create-billing-portal");
if (data?.url) window.location.href = data.url;
```
Disabled + tooltip "No active subscription" when no `subscription` row is present.

### 4. Keep existing UI
- The 3 "Buy again" plan cards (Full Works / Elite / Retainer) stay as-is.
- The legacy `retainerOrders` payment history list stays as-is for historical receipts.

## Out of scope
- Showing renewal receipts / invoices history (would need a new edge function listing Stripe invoices).
- Tier upgrade/downgrade UI inside the portal (Stripe Billing Portal already handles this).
- Changes to other tabs.
