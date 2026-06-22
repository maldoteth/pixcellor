// Daily cron — picks every outstanding invoice and sends the right reminder.
// Stages: day 14 → friendly, day 21 → second, day 28 → overdue, day 35 → final notice.
// Idempotent: each invoice's reminder_stage gates the next stage.
// Triggered by pg_cron POSTing to this function with the service-role key.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getServiceClient, sendInvoiceEmail, hostedInvoiceUrl, logInvoiceEvent } from "../_shared/invoice-helpers.ts";
import { BANK_DETAILS, SUPPLIER, formatGbp, formatDateUk } from "../_shared/invoice-config.ts";

type Stage = "friendly" | "second" | "overdue" | "final";

const STAGE_ORDER: Stage[] = ["none" as unknown as Stage, "friendly", "second", "overdue", "final"];
function stageIndex(s: string) { return STAGE_ORDER.indexOf(s as Stage); }

function pickStage(daysSinceIssue: number, currentStage: string): Stage | null {
  // Friendly at 14, second at 21, overdue at 28, final at 35.
  if (daysSinceIssue >= 35 && stageIndex(currentStage) < stageIndex("final")) return "final";
  if (daysSinceIssue >= 28 && stageIndex(currentStage) < stageIndex("overdue")) return "overdue";
  if (daysSinceIssue >= 21 && stageIndex(currentStage) < stageIndex("second")) return "second";
  if (daysSinceIssue >= 14 && stageIndex(currentStage) < stageIndex("friendly")) return "friendly";
  return null;
}

function isInternalAuth(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return Boolean(serviceKey) && auth === `Bearer ${serviceKey}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // Allow cron + manual admin trigger via service-role
  if (!isInternalAuth(req)) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const supabase = getServiceClient();
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .in("status", ["sent", "viewed", "partial", "overdue"])
    .eq("reminders_paused", false);
  if (error) {
    console.error("reminders fetch failed", error);
    return new Response(JSON.stringify({ error: "fetch_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const results: Array<{ id: string; sent: Stage | null; reason?: string }> = [];

  for (const inv of invoices ?? []) {
    const issuedMs = new Date(inv.issued_at).getTime();
    const daysSinceIssue = Math.floor((now - issuedMs) / 86_400_000);
    const stage = pickStage(daysSinceIssue, inv.reminder_stage);
    if (!stage) { results.push({ id: inv.id, sent: null, reason: "no_stage" }); continue; }
    if (inv.last_reminder_at && inv.last_reminder_at.slice(0, 10) === today) {
      results.push({ id: inv.id, sent: null, reason: "already_today" });
      continue;
    }

    const dueMs = new Date(inv.due_at).getTime();
    const daysOverdue = Math.max(0, Math.floor((now - dueMs) / 86_400_000));

    const ok = await sendInvoiceEmail({
      templateName: "invoice-reminder",
      recipientEmail: inv.billing_email,
      idempotencyKey: `invoice-reminder-${inv.id}-${stage}`,
      templateData: {
        stage,
        invoiceNumber: inv.invoice_number,
        amountFormatted: formatGbp(inv.total_pence - inv.amount_paid_pence),
        dueDateFormatted: formatDateUk(inv.due_at),
        daysSinceIssue,
        daysOverdue,
        hostedUrl: hostedInvoiceUrl(inv.public_token),
        billingName: inv.billing_name,
        bankPayee: BANK_DETAILS.payeeName,
        bankSortCode: BANK_DETAILS.sortCode,
        bankAccount: BANK_DETAILS.accountNumber,
        paymentReference: inv.invoice_number,
        supplierName: SUPPLIER.legalName,
      },
    });

    const newStatus = stage === "overdue" || stage === "final" ? "overdue" : inv.status;
    await supabase.from("invoices").update({
      reminder_stage: stage,
      last_reminder_at: new Date().toISOString(),
      status: newStatus,
    }).eq("id", inv.id);
    await logInvoiceEvent(inv.id, "reminder_sent", `Sent '${stage}' reminder (${daysSinceIssue}d since issue)`, { stage, daysSinceIssue, daysOverdue, email_ok: ok });
    results.push({ id: inv.id, sent: stage });
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
