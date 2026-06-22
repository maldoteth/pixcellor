// Shared backend helpers for the invoice flow:
// - Upsert a CRM contact for the billing email
// - Build the canonical hosted invoice URL
// - Send any invoice email template via the existing send-transactional-email function
// - Generate and store the PDF in the `invoices` storage bucket

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderInvoicePdf, type InvoiceForPdf } from "./invoice-pdf.ts";
import { SITE_URL } from "./invoice-config.ts";

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function hostedInvoiceUrl(publicToken: string, baseOverride?: string) {
  const base = baseOverride || SITE_URL;
  return `${base.replace(/\/$/, "")}/invoice/${publicToken}`;
}

export async function upsertContactForInvoice(opts: {
  email: string;
  name: string;
  phone?: string | null;
  company?: string | null;
  address_line1?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
}) {
  const supabase = getServiceClient();
  const email = opts.email.trim().toLowerCase();
  const company = opts.company?.trim() || "";
  const personName = opts.name?.trim() || "";
  // The CRM card title (`contacts.name`) is the COMPANY where available, with the
  // person stored in `contact_name`. Falls back to the person's name then email
  // when no company was supplied.
  const displayName = company || personName || email;
  const contactPerson = personName || null;
  const locationParts = [opts.address_line1, opts.city, opts.postcode, opts.country]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  const location = locationParts.length ? locationParts.join(", ") : null;

  // Look up by email (case-insensitive)
  const { data: existing } = await supabase
    .from("contacts")
    .select("id, status, name, contact_name, location, phone")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const update: Record<string, unknown> = {};
    if (company) update.name = displayName; // prefer company as the card title
    if (contactPerson && !existing.contact_name) update.contact_name = contactPerson;
    if (location && !existing.location) update.location = location;
    if (opts.phone && !existing.phone) update.phone = opts.phone;
    if (existing.status === "cold") update.status = "warm";
    if (Object.keys(update).length > 0) {
      await supabase.from("contacts").update(update).eq("id", existing.id);
    }
    return existing.id as string;
  }
  const { data: inserted, error } = await supabase
    .from("contacts")
    .insert({
      name: displayName,
      email,
      phone: opts.phone ?? null,
      contact_name: contactPerson,
      location,
      source: "invoice",
      status: "warm",
      industry: "general",
    })
    .select("id")
    .single();
  if (error) {
    console.error("upsertContactForInvoice failed", error);
    return null;
  }
  return inserted.id as string;
}

export async function logInvoiceEvent(invoiceId: string, eventType: string, message?: string, metadata: Record<string, unknown> = {}) {
  const supabase = getServiceClient();
  await supabase.from("invoice_events").insert({
    invoice_id: invoiceId,
    event_type: eventType,
    message: message ?? null,
    metadata,
  });
}

export async function generateAndStoreInvoicePdf(invoice: InvoiceForPdf, invoiceId: string): Promise<string> {
  const supabase = getServiceClient();
  const bytes = await renderInvoicePdf(invoice);
  const path = `${invoiceId}.pdf`;
  const { error } = await supabase.storage.from("invoices").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw new Error(`PDF upload failed: ${error.message}`);
  await supabase.from("invoices").update({ pdf_storage_path: path, pdf_generated_at: new Date().toISOString() }).eq("id", invoiceId);
  await logInvoiceEvent(invoiceId, "pdf_generated", "Invoice PDF generated");
  return path;
}

export async function signedPdfUrl(path: string, expiresSeconds = 60 * 60 * 24 * 14) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage.from("invoices").createSignedUrl(path, expiresSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function sendInvoiceEmail(opts: {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData: Record<string, unknown>;
}) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("send-transactional-email failed", res.status, body);
  }
  return res.ok;
}
