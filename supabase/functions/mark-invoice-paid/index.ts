// Marks an invoice as paid:
// - admin-only (verifies JWT + has_role 'admin')
// - records paid_at, payment reference, payment method
// - logs event
// - sends the paid-receipt email
// - bumps the linked contact to 'customer'

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getServiceClient, sendInvoiceEmail, hostedInvoiceUrl, logInvoiceEvent } from "../_shared/invoice-helpers.ts";
import { SUPPLIER, formatGbp, formatDateUk } from "../_shared/invoice-config.ts";

const BodySchema = z.object({
  invoice_id: z.string().uuid(),
  payment_reference: z.string().max(120).optional(),
  payment_method: z.enum(["bank_transfer", "cash", "card_offline", "cheque", "other"]).optional(),
  paid_at: z.string().datetime().optional(),
  amount_paid_pence: z.number().int().min(0).optional(),
  skip_email: z.boolean().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // Auth: caller must be an admin
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "missing_auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  const user = userRes?.user;
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabase = getServiceClient();
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid_input", fields: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const { invoice_id, payment_reference, payment_method, paid_at, amount_paid_pence, skip_email } = parsed.data;

  const { data: inv, error: getErr } = await supabase.from("invoices").select("*").eq("id", invoice_id).single();
  if (getErr || !inv) return new Response(JSON.stringify({ error: "invoice_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (inv.status === "paid") return new Response(JSON.stringify({ ok: true, already_paid: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const paidAt = paid_at ?? new Date().toISOString();
  const amount = amount_paid_pence ?? inv.total_pence;

  const { error: upErr } = await supabase.from("invoices").update({
    status: "paid",
    paid_at: paidAt,
    amount_paid_pence: amount,
    payment_reference: payment_reference ?? null,
    payment_method: payment_method ?? "bank_transfer",
    marked_paid_by: user.id,
    reminder_stage: "stopped",
  }).eq("id", invoice_id);
  if (upErr) {
    console.error("mark paid failed", upErr);
    return new Response(JSON.stringify({ error: "update_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  await logInvoiceEvent(invoice_id, "marked_paid", `Marked paid (${formatGbp(amount)})`, {
    actor_email: user.email,
    payment_method: payment_method ?? "bank_transfer",
    payment_reference: payment_reference ?? null,
  });

  // Bump contact to customer
  if (inv.contact_id) {
    await supabase.from("contacts").update({ status: "customer" }).eq("id", inv.contact_id);
  }

  // Send receipt
  if (!skip_email) {
    await sendInvoiceEmail({
      templateName: "invoice-paid-receipt",
      recipientEmail: inv.billing_email,
      idempotencyKey: `invoice-paid-${invoice_id}`,
      templateData: {
        invoiceNumber: inv.invoice_number,
        amountFormatted: formatGbp(amount),
        paidDateFormatted: formatDateUk(paidAt),
        billingName: inv.billing_name,
        hostedUrl: hostedInvoiceUrl(inv.public_token),
        supplierName: SUPPLIER.legalName,
        paymentReference: payment_reference ?? inv.invoice_number,
      },
    });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
