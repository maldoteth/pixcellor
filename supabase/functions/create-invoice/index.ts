// Creates an invoice end-to-end:
// - validates input
// - looks up / creates a CRM contact
// - generates a sequential invoice number + public token
// - writes invoices + invoice_line_items + 'issued' event
// - renders the PDF and uploads to the private 'invoices' bucket
// - sends the invoice-issued email with a signed PDF link
// - returns invoice id, number, hosted URL, signed PDF URL
//
// Callable two ways:
//   1) Public buyer flow (anon) — must include a `package_slug` from the allowlist,
//      and the price is sourced server-side from PACKAGE_CATALOG (cannot be set by client).
//   2) Internal Alex/portal flow (service role) — full line_items + amounts are accepted.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  getServiceClient,
  upsertContactForInvoice,
  generateAndStoreInvoicePdf,
  signedPdfUrl,
  sendInvoiceEmail,
  hostedInvoiceUrl,
  logInvoiceEvent,
} from "../_shared/invoice-helpers.ts";
import { BANK_DETAILS, PAYMENT_TERMS_DAYS, PAYMENT_TERMS_LABEL, SUPPLIER, formatGbp, formatDateUk } from "../_shared/invoice-config.ts";

// Public, server-side allowlist of packages buyers can self-invoice for.
// Prevents anyone from injecting their own price client-side.
const PACKAGE_CATALOG: Record<string, { name: string; description: string; amount_pence: number }> = {
  "full-works": { name: "Full Works", description: "Full Works website build (one-time)", amount_pence: 16900 },
  elite: { name: "Elite Build", description: "Elite flagship build (one-time)", amount_pence: 47900 },
  "retainer-growth": { name: "Growth retainer", description: "Growth retainer — first month", amount_pence: 8900 },
  "retainer-scale": { name: "Scale retainer", description: "Scale retainer — first month", amount_pence: 36900 },
  "retainer-enterprise": { name: "Enterprise retainer", description: "Enterprise retainer — first month", amount_pence: 246900 },
};

const LineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().max(10000).default(1),
  unit_amount_pence: z.number().int().min(1).max(100_000_000),
});

const BillingSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  company: z.string().max(200).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  address_line1: z.string().max(200).optional().nullable(),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  postcode: z.string().max(20).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  po_reference: z.string().max(80).optional().nullable(),
});

const BodySchema = z.object({
  package_slug: z.string().max(80).optional(),
  line_items: z.array(LineItemSchema).max(40).optional(),
  billing: BillingSchema,
  due_days: z.number().int().min(1).max(180).optional(),
  internal_note: z.string().max(2000).optional(),
  source: z.enum(["public_checkout", "alex_chat", "portal_manual", "api"]).optional(),
  conversation_id: z.string().uuid().optional(),
  created_by_email: z.string().email().max(320).optional(),
});

function isInternalAuth(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return Boolean(serviceKey) && auth === `Bearer ${serviceKey}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid_input", fields: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const body = parsed.data;
  const internal = isInternalAuth(req);

  // Resolve line items
  let lineItems = body.line_items ?? [];
  let packageSlug = body.package_slug ?? null;

  if (!internal) {
    // Public callers MUST use the package catalog — they may not specify arbitrary line items / amounts
    if (!packageSlug || !PACKAGE_CATALOG[packageSlug]) {
      return new Response(JSON.stringify({ error: "invalid_package" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const pkg = PACKAGE_CATALOG[packageSlug];
    lineItems = [{ description: pkg.description, quantity: 1, unit_amount_pence: pkg.amount_pence }];
  } else {
    if (lineItems.length === 0 && packageSlug && PACKAGE_CATALOG[packageSlug]) {
      const pkg = PACKAGE_CATALOG[packageSlug];
      lineItems = [{ description: pkg.description, quantity: 1, unit_amount_pence: pkg.amount_pence }];
    }
  }
  if (lineItems.length === 0) {
    return new Response(JSON.stringify({ error: "no_line_items" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = getServiceClient();

  // Compute totals
  const itemsWithTotals = lineItems.map((li, idx) => {
    const line_total = Math.round(li.quantity * li.unit_amount_pence);
    return { ...li, line_total_pence: line_total, sort_order: idx };
  });
  const subtotal = itemsWithTotals.reduce((s, li) => s + li.line_total_pence, 0);
  const total = subtotal; // no VAT, no discounts

  // Invoice number + token
  const { data: numRes, error: numErr } = await supabase.rpc("next_invoice_number");
  if (numErr || !numRes) {
    console.error("next_invoice_number failed", numErr);
    return new Response(JSON.stringify({ error: "numbering_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const invoiceNumber = numRes as string;

  // Upsert contact (best effort)
  const contactId = await upsertContactForInvoice({
    email: body.billing.email,
    name: body.billing.name,
    phone: body.billing.phone ?? undefined,
    company: body.billing.company ?? undefined,
    address_line1: body.billing.address_line1 ?? undefined,
    city: body.billing.city ?? undefined,
    postcode: body.billing.postcode ?? undefined,
    country: body.billing.country ?? undefined,
  });

  const dueDays = body.due_days ?? PAYMENT_TERMS_DAYS;
  const issuedAt = new Date();
  const dueAt = new Date(issuedAt.getTime() + dueDays * 86_400_000);

  // Insert invoice
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      contact_id: contactId,
      package_slug: packageSlug,
      conversation_id: body.conversation_id ?? null,
      source: body.source ?? (internal ? "portal_manual" : "public_checkout"),
      status: "sent",
      issued_at: issuedAt.toISOString(),
      due_at: dueAt.toISOString(),
      subtotal_pence: subtotal,
      total_pence: total,
      currency: "gbp",
      billing_name: body.billing.name,
      billing_company: body.billing.company ?? null,
      billing_email: body.billing.email.trim().toLowerCase(),
      billing_phone: body.billing.phone ?? null,
      billing_address_line1: body.billing.address_line1 ?? null,
      billing_address_line2: body.billing.address_line2 ?? null,
      billing_city: body.billing.city ?? null,
      billing_postcode: body.billing.postcode ?? null,
      billing_country: body.billing.country ?? "United Kingdom",
      po_reference: body.billing.po_reference ?? null,
      payment_terms_days: dueDays,
      payment_terms_label: dueDays === PAYMENT_TERMS_DAYS ? PAYMENT_TERMS_LABEL : `Payment due within ${dueDays} days of issue`,
      internal_note: body.internal_note ?? null,
      created_by_email: body.created_by_email ?? null,
    })
    .select("*")
    .single();

  if (invErr || !inv) {
    console.error("invoice insert failed", invErr);
    return new Response(JSON.stringify({ error: "invoice_insert_failed", detail: invErr?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Line items
  const { error: liErr } = await supabase.from("invoice_line_items").insert(
    itemsWithTotals.map((li) => ({
      invoice_id: inv.id,
      description: li.description,
      quantity: li.quantity,
      unit_amount_pence: li.unit_amount_pence,
      line_total_pence: li.line_total_pence,
      sort_order: li.sort_order,
    })),
  );
  if (liErr) console.error("line items insert failed", liErr);

  await logInvoiceEvent(inv.id, "issued", `Invoice ${invoiceNumber} issued for ${formatGbp(total)}`, {
    source: inv.source,
    contact_id: contactId,
  });

  // Generate PDF + signed URL
  const hostedUrl = hostedInvoiceUrl(inv.public_token);
  try {
    await generateAndStoreInvoicePdf({
      invoice_number: invoiceNumber,
      issued_at: inv.issued_at,
      due_at: inv.due_at,
      status: inv.status,
      billing_name: inv.billing_name,
      billing_company: inv.billing_company,
      billing_email: inv.billing_email,
      billing_address_line1: inv.billing_address_line1,
      billing_address_line2: inv.billing_address_line2,
      billing_city: inv.billing_city,
      billing_postcode: inv.billing_postcode,
      billing_country: inv.billing_country,
      po_reference: inv.po_reference,
      subtotal_pence: subtotal,
      total_pence: total,
      amount_paid_pence: 0,
      line_items: itemsWithTotals.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unit_amount_pence: li.unit_amount_pence,
        line_total_pence: li.line_total_pence,
      })),
      hosted_url: hostedUrl,
    }, inv.id);
  } catch (e) {
    console.error("pdf generation failed", e);
  }

  const pdfUrl = inv.pdf_storage_path
    ? await signedPdfUrl(inv.pdf_storage_path)
    : await signedPdfUrl(`${inv.id}.pdf`);

  // Send invoice email
  await sendInvoiceEmail({
    templateName: "invoice-issued",
    recipientEmail: inv.billing_email,
    idempotencyKey: `invoice-issued-${inv.id}`,
    templateData: {
      invoiceNumber,
      amountFormatted: formatGbp(total),
      dueDateFormatted: formatDateUk(inv.due_at),
      hostedUrl,
      pdfUrl: pdfUrl ?? undefined,
      billingName: inv.billing_name,
      bankPayee: BANK_DETAILS.payeeName,
      bankSortCode: BANK_DETAILS.sortCode,
      bankAccount: BANK_DETAILS.accountNumber,
      paymentReference: invoiceNumber,
      supplierName: SUPPLIER.legalName,
    },
  });

  return new Response(JSON.stringify({
    ok: true,
    invoice_id: inv.id,
    invoice_number: invoiceNumber,
    public_token: inv.public_token,
    hosted_url: hostedUrl,
    pdf_url: pdfUrl,
    total_pence: total,
    due_at: inv.due_at,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
