
## Invoice payments — what gets built

A complete bank-transfer / invoice payment path running alongside the existing Stripe card flow. Buyers can choose "Pay by bank transfer", get a proper PDF invoice with Delabs Ltd transfer instructions, view it on a branded page, and you (or Alex) can issue invoices manually from the CRM and chat. The system tracks status, chases overdue payment automatically, and you mark paid in one click.

### 1. New "Pay by invoice" choice at checkout
- Every Buy button in `PackagesDialog` (and Alex's package send-out) opens a small **payment-method dialog**:
  - **Pay by card** → existing Stripe flow, unchanged.
  - **Pay by bank transfer (invoice)** → opens an invoice form.
- Invoice form collects: full name, company (optional), email, billing address (line 1, city, postcode, country), phone (optional), PO reference (optional).
- On submit: creates the invoice + order in the database, generates the PDF, emails it, and redirects to the hosted invoice page.

### 2. Invoice data model
New tables (all behind RLS, admin + service-role only; buyers access their invoice via a public token):
- `invoices` — id, invoice_number (sequential `INV-2026-0001`), public_token, contact_id, order_session_id (links to `stripe_checkout_sessions`), package_slug, status (`draft|sent|partial|paid|overdue|cancelled|written_off`), issued_at, due_at (issued + 28 days), paid_at, total_amount_pence, currency, billing_name/company/email/address/phone, po_reference, internal_note, last_reminder_at, reminder_stage.
- `invoice_line_items` — id, invoice_id, description, quantity, unit_amount_pence, line_total_pence, sort_order.
- `invoice_events` — append-only audit log (issued, viewed, reminder_sent, marked_paid, cancelled, exported_pdf) — used for the activity feed on the hosted page and CRM.

Schema notes: no VAT columns, no VAT line items, no "VAT" wording anywhere — invoices read as standard commercial invoices. Sequential numbering is generated atomically inside the create function using a Postgres sequence.

### 3. PDF generation + hosted invoice page
- Edge function `generate-invoice-pdf` renders a clean, brand-consistent PDF using **pdf-lib** (pure JS, runs in Deno) — Delabs Ltd letterhead, line items, totals, "Payment terms: 28 days from issue", "Due by [date]", bank details (Payee: Delabs Ltd · Sort code: 60-84-64 · Account: 86111053 · Reference: INV-2026-0001), and footer with company contact info.
- PDF stored in a new private Supabase Storage bucket `invoices/` keyed by `invoice_id.pdf`; signed URLs used for email attachment and download.
- Hosted page at `/invoice/:token` (public, no auth) renders the same invoice in-page with: status badge, line items, totals, transfer instructions block with copy-to-clipboard chips, "Download PDF" button, "Pay by card instead" link (creates a Stripe checkout for the same amount), and reminder/activity timeline. Marks invoice as `viewed` on first load.

### 4. Email flow
Uses the existing Lovable Email infrastructure (already set up). New React Email templates in `_shared/transactional-email-templates/`:
- `invoice-issued` — "Your invoice INV-2026-0001 from Delabs Ltd", embeds key details, "View invoice" link, bank transfer block, PDF attached.
- `invoice-reminder-friendly` — day 14, polite nudge.
- `invoice-reminder-second` — day 21, firmer.
- `invoice-overdue` — day 28+, "Now overdue", restates terms.
- `invoice-final-notice` — day 35.
- `invoice-paid-receipt` — sent when you mark paid; thanks the client and confirms project kick-off / next steps.
- All templates registered in `registry.ts`, deployed via `deploy_edge_functions`.

### 5. Order confirmation & CRM auto-linking
At invoice creation:
1. Look up an existing `contacts` row by lowercased email; create one if missing (`source = 'invoice'`, status `warm`, name = billing name, plus phone/company/notes).
2. Create a `stripe_checkout_sessions` row to represent the order — `payment_status = 'unpaid'`, `mode = 'payment'`, marked as `payment_method = 'bank_transfer'`, links to invoice_id and contact_id so the existing portal "Orders" view shows it natively as an outstanding bank-transfer order.
3. Send `invoice-issued` email to client and an internal alert via the existing admin alert flow.

When you click **Mark paid** (see step 7), the same order row flips to `paid`, the `invoice-paid-receipt` fires, and the contact moves to `customer`.

### 6. Auto reminders (cron)
- New edge function `send-invoice-reminders` runs daily via `pg_cron` at 09:30 UK time.
- For every `sent` / `partial` / `overdue` invoice it picks the right template based on days since issue: 14 → friendly, 21 → second, 28 → overdue (also flips status to `overdue`), 35 → final notice. After day 35 it stops auto-chasing and surfaces in a CRM "Needs attention" filter.
- Each send writes an `invoice_events` row and updates `last_reminder_at` / `reminder_stage`. Idempotent — re-running same day does nothing.

### 7. Admin / portal additions
- New "Invoices" tab in `Portal` (admin-only): list with filter chips (Outstanding / Overdue / Paid / All), search by number/email, click row → detail drawer with line items, activity feed, "Mark as paid" button (records `paid_at`, optional reference field for the bank ref / cheque no.), "Send reminder now", "Cancel invoice", "Download PDF", "Copy hosted link".
- "Outstanding invoices" KPI added to dashboard summary.

### 8. Alex chatbot integration
- New `create_invoice` tool added to `sales-chat`. Takes `client_email`, optional `client_name/company/address`, `line_items[]`, optional `due_days` (default 28), optional `po_reference`, optional `package_slug`. Reuses the same create-invoice edge function so behaviour is identical to the public flow. Returns the invoice number, total, hosted URL, and PDF link as a clean markdown reply.
- Alex's system prompt updated:
  - When closing a deal in chat, always offer **"card link or invoice (bank transfer)"** as the two payment options.
  - "Invoice" path → ask for billing details if missing, then call `create_invoice`; never invent line items.
  - When `create_custom_order` is called with `mark_paid=false`, Alex now also has the option to attach an invoice instead of a Stripe link if the client prefers bank transfer.

### 9. Compliance & polish (no VAT mention anywhere)
- Sequential invoice numbers (UK requirement), issue date, due date, supplier full legal name + registered address (Delabs Ltd) + company number, customer name + billing address, clear description of services, amount due, 28-day payment terms statement, bank details, "Please quote invoice number as payment reference" line.
- All money handled in integer pence; display formatted GBP with `Intl.NumberFormat`.
- PDF is the canonical record — once an invoice is `sent`, line items / amounts become read-only (can only cancel + reissue, which generates a new number and links back to the cancelled one).
- All edits/cancellations recorded in `invoice_events` for an audit trail.
- Public hosted page uses the random `public_token` (not the invoice id) so URLs aren't enumerable.

### Build order
1. Migration: tables, sequence, RLS, GRANTs, storage bucket.
2. Edge functions: `create-invoice`, `generate-invoice-pdf`, `mark-invoice-paid`, `send-invoice-reminders`.
3. Email templates + register + deploy.
4. Hosted `/invoice/:token` page.
5. Payment-method dialog + invoice form in `PackagesDialog`.
6. Portal "Invoices" tab + mark-paid UI.
7. Cron schedule for reminders.
8. Alex `create_invoice` tool + system-prompt update.
9. End-to-end test: create invoice → email arrives with PDF → hosted page loads → mark paid → receipt email fires → CRM contact + order updated.

Approve and I'll start with the migration and core edge functions.
