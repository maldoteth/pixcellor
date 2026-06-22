// Returns a fresh signed URL for an invoice's PDF.
// Public access: callers must know the invoice's public_token (not enumerable).
// Auto-regenerates the PDF if it's missing.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getServiceClient, signedPdfUrl, generateAndStoreInvoicePdf } from "../_shared/invoice-helpers.ts";

const QuerySchema = z.object({ token: z.string().min(8).max(128) });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ token: url.searchParams.get("token") ?? "" });
  if (!parsed.success) return new Response(JSON.stringify({ error: "invalid_token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabase = getServiceClient();
  const { data: inv } = await supabase.from("invoices").select("*").eq("public_token", parsed.data.token).maybeSingle();
  if (!inv) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let path = inv.pdf_storage_path as string | null;
  if (!path) {
    const { data: items } = await supabase.from("invoice_line_items").select("*").eq("invoice_id", inv.id).order("sort_order");
    try {
      path = await generateAndStoreInvoicePdf({
        invoice_number: inv.invoice_number,
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
        subtotal_pence: inv.subtotal_pence,
        total_pence: inv.total_pence,
        amount_paid_pence: inv.amount_paid_pence,
        line_items: (items ?? []).map((li: any) => ({
          description: li.description,
          quantity: Number(li.quantity),
          unit_amount_pence: Number(li.unit_amount_pence),
          line_total_pence: Number(li.line_total_pence),
        })),
      }, inv.id);
    } catch (e) {
      console.error("on-demand pdf failed", e);
      return new Response(JSON.stringify({ error: "pdf_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  const signed = await signedPdfUrl(path!, 60 * 60 * 24);
  if (!signed) return new Response(JSON.stringify({ error: "sign_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ url: signed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
