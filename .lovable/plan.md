# Custom Stripe Payment Links (Admin)

Add an admin-only tool inside the Customer Portal that lets you create a Stripe payment link for any amount (one-off or recurring), copy the link, and send it to a client. Paid links flow through the existing `stripe-webhook` so they appear in your orders list.

## What you'll get

- New "Custom links" tab in the admin portal (admins only).
- Form: client email (optional), description / line item label, amount (GBP), quantity, optional "applies as retainer" toggle (creates a recurring monthly price), optional internal note.
- "Create link" button → generates a Stripe Payment Link → shows URL with copy button.
- Table of recently created custom links with status (open / paid / expired), amount, client email, created date, and a copy-link action.
- Paid custom links land in the existing orders flow so dashboards/emails keep working.

## Technical details

1. **DB migration** — new table `custom_payment_links`:
   - `id`, `created_at`, `created_by_user_id`
   - `stripe_price_id`, `stripe_product_id`, `stripe_payment_link_id`, `url`
   - `description`, `amount_gbp` (numeric), `currency` (default `gbp`), `quantity`, `mode` (`payment` | `subscription`)
   - `client_email` (nullable), `internal_note` (nullable)
   - `status` (`open` | `paid` | `void`), `paid_session_id` (nullable), `paid_at` (nullable)
   - RLS: admins manage; service role manages.

2. **Edge function `create-custom-payment-link`** (admin JWT verified in code, checks `has_role(uid,'admin')`):
   - Creates a Stripe Product + Price (`unit_amount = amount_gbp * 100`, recurring if mode=subscription).
   - Creates a Payment Link with metadata `{ kind: "custom", custom_link_id, client_email }`.
   - Inserts row into `custom_payment_links`, returns `{ url, id }`.

3. **`stripe-webhook` update**:
   - On `checkout.session.completed`, if `metadata.kind === "custom"`, mark matching `custom_payment_links` row `paid` with `paid_session_id` and `paid_at`. Continue existing order-recording logic so the payment also shows in the standard sessions table.

4. **Admin UI** in `src/pages/CustomerPortal.tsx`:
   - New `CustomLinksTab` component (lazy-loaded), only rendered when `isAdmin`.
   - Form with shadcn `Input`, `Textarea`, `Select` (mode), `Switch` (recurring), `Button`.
   - Calls `supabase.functions.invoke('create-custom-payment-link', { body })`.
   - Shows result with copy-to-clipboard and a recent-links table backed by `supabase.from('custom_payment_links').select(...)`.

5. **No changes** to public pricing, customer-facing flows, or existing orders.

## Out of scope (can do later if you want)

- Sending the link by email automatically from the portal.
- Refund / void controls inline (use Stripe dashboard for now, or your existing refund tooling).
- Multi-currency (locked to GBP to match the rest of the app).
