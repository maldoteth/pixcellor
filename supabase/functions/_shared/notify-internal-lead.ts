// Sends an internal new-lead notification to the Pixcellor team.
// Fire-and-forget — never throws; logs warnings on failure.

export const INTERNAL_LEAD_RECIPIENTS = [
  "malik@dehub.net",
  "dehub.bsc@gmail.com",
  "malikottomanjan@gmail.com",
  "evhernandezph61@gmail.com",
];

export interface InternalLeadPayload {
  sourceLabel: string;        // e.g. "Pixcellor — Let's Talk"
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  leadMessage?: string;
  contactId: string;          // used as part of idempotency
  eventId?: string;           // per-event id (booking id, inquiry id) to keep idempotency unique per event
}

export async function notifyInternalLead(payload: InternalLeadPayload): Promise<void> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn("notifyInternalLead: missing env, skipping");
    return;
  }

  const receivedAt = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });

  await Promise.all(
    INTERNAL_LEAD_RECIPIENTS.map(async (recipient) => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            templateName: "customer-lead-notification",
            recipientEmail: recipient,
            idempotencyKey: `internal-lead-${payload.contactId}-${payload.eventId ?? "x"}-${recipient}`,
            templateData: {
              customerWebsiteName: payload.sourceLabel,
              leadName: payload.leadName || "",
              leadEmail: payload.leadEmail || "",
              leadPhone: payload.leadPhone || "",
              leadMessage: payload.leadMessage || "",
              receivedAt,
            },
          }),
        });
        if (!resp.ok) {
          const t = await resp.text().catch(() => "");
          console.warn(`internal lead notify failed (${recipient}):`, resp.status, t);
        }
      } catch (e) {
        console.warn(`internal lead notify error (${recipient}):`, e);
      }
    }),
  );
}
