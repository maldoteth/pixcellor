## Custom orders – two fixes

### 1. Copy Stripe link button on the custom order row

Currently the Stripe link only appears in a small strip below the order header (with tiny Copy/Open buttons), and only when the order is expanded/visible. For custom orders we want the copy action right at the top of the card alongside Send confirmation / Mark delivered.

**Edit `src/pages/Portal.tsx` (around line 2412–2438, the action button cluster in the order header):**
- When `metadata.payment_link_url` exists, render a `Copy Stripe link` button (icon + label) in the top action row.
- Click → `navigator.clipboard.writeText(url)` + toast `"Stripe payment link copied"`.
- Keep the existing detail strip below (open in new tab + paid/awaiting badge) — it carries useful state info.

### 2. Fix `Send confirmation` for unpaid custom (draft) orders

Today `supabase/functions/send-order-confirmation/index.ts` rejects anything that is not `paid`/`complete` with `"Only paid orders can receive confirmation emails"`. That is why it appears broken on custom drafts.

Desired behaviour:
- **Paid order** → unchanged: send the existing package confirmation template (`full-works-order-confirmation` / `elite-order-confirmation` / `retainer-order-confirmation`) which already links to project requirements.
- **Unpaid custom order** (`metadata.source === "admin_manual"` and `metadata.payment_link_url` present) → send a new "custom invoice" email containing the description, amount, and a CTA button to the Stripe payment link.

**Changes:**

a. New transactional template `supabase/functions/_shared/transactional-email-templates/custom-invoice.tsx`
   - Props: `description`, `amountFormatted`, `paymentUrl`, `orderId`.
   - Subject: `"Your invoice from Pixcellor"`.
   - Body: short intro, line item (description + amount), big "Pay now" button → `paymentUrl`, fallback link, footer.
   - Match existing template styling (read `full-works-order-confirmation.tsx` for visual parity).
   - Register in `_shared/transactional-email-templates/registry.ts` as `custom-invoice`.

b. Update `supabase/functions/send-order-confirmation/index.ts`
   - After loading the order, branch:
     - If `metadata.source === "admin_manual"` and not paid:
       - Require `metadata.payment_link_url` (else 400 "No payment link on this order").
       - Call `send-transactional-email` with `templateName: "custom-invoice"`, `templateData: { description: metadata.custom_label || package_name, amountFormatted: formatGBP(amount_total), paymentUrl, orderId: orderCode }`, idempotency `manual-custom-invoice-${session_id}-${Date.now()}`.
       - Return success.
     - Else keep current paid-order flow.
   - Remove the blanket "Only paid orders can receive confirmation emails" 400 — replace with the branching above.

c. Deploy edge functions (`send-order-confirmation`) — automatic on save, but template change also requires the registry to be picked up by `send-transactional-email` (already auto-deployed).

### Out of scope
- No DB / RLS / schema changes.
- No changes to the existing list-strip Stripe link UI besides adding the new top-row button.
- No changes to checkout, webhook, or paid-flow templates.

### Expected result
- Admin can copy the Stripe link with one click from the custom order header.
- Clicking `Send confirmation` on an unpaid custom draft emails the client the invoice + Stripe pay link instead of erroring; on a paid order it continues to send the package confirmation as before.
