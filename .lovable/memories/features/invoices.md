---
name: Invoice system
description: Pay-by-invoice (bank transfer) flow — schema, edge functions, hosted page, admin UI, Alex tool, cron, bank details
type: feature
---

# Invoices (bank transfer / "pay by invoice")

Runs alongside the existing Stripe card flow. Used by the public checkout (PackagesDialog), Alex chatbot, and the admin portal.

## Bank details (always shown on every invoice — never mention VAT)
- Payee: **Delabs Ltd**
- Sort code: **60-84-64**
- Account: **86111053**
- Reference: the invoice number, always

## Payment terms
- **28 days** from issue, on every invoice. Do not change unless the user explicitly asks for that one invoice.
- Auto reminders: friendly @ day 14, second @ 21, overdue @ 28, final notice @ 35. Stops auto-chasing after day 35.

## Database
- `invoices` — sequential `INV-YYYY-NNNN` numbers, public_token for hosted page, status lifecycle (sent → viewed → overdue → paid / cancelled), full billing snapshot.
- `invoice_line_items`, `invoice_events` (audit trail).
- Public read via `public.get_invoice_by_token(text)` RPC (records `viewed` automatically).

## Edge functions
- `create-invoice` — main entry. Public buyers must pass a `package_slug` from the server-side allowlist; service-role / Alex can pass arbitrary line_items.
- `mark-invoice-paid` — admin-only, fires `invoice-paid-receipt` email + bumps contact to `customer`.
- `send-invoice-reminders` — daily cron at 09:30 UTC, idempotent per stage.
- `get-invoice-pdf` — returns a signed URL; regenerates the PDF on demand if missing.

PDFs are generated server-side with `pdf-lib` and stored in the private `invoices` storage bucket.

## Email templates
- `invoice-issued`, `invoice-reminder` (stage-driven: friendly/second/overdue/final), `invoice-paid-receipt` — all registered in the transactional registry.

## Frontend surfaces
- `PaymentMethodDialog` is shown before every package buy — choose card (existing Stripe flow) or invoice (bank transfer).
- Hosted invoice page at `/invoice/:token` — public, no auth, marks viewed on first load.
- Admin at `/invoices-admin` — filters (outstanding / overdue / paid / all), mark-paid + receipt, copy hosted link.

## Alex (sales-chat) integration
- New `create_invoice` tool. Use whenever a client wants to pay by bank transfer / asks for an invoice / needs something for accounts. Amounts in **pence**. Default `due_days = 28`. Auto-creates CRM contact + sends PDF + chases reminders.
- System-prompt rule #10 tells Alex to always offer "card link or invoice" when closing.

## Compliance notes
- No VAT mention anywhere — Delabs Ltd is not VAT-registered.
- Sequential numbering, issue + due dates, supplier + customer details, line items, totals, bank details, "Quote invoice number as reference" — all present on PDF and hosted page.
- Public hosted page uses random `public_token` (not the invoice id) so URLs aren't enumerable.

## Where to edit
- Supplier / bank details: `supabase/functions/_shared/invoice-config.ts` (mirrored in `src/pages/InvoiceView.tsx`).
- Package allowlist for the public buyer flow: `PACKAGE_CATALOG` in `supabase/functions/create-invoice/index.ts`.
