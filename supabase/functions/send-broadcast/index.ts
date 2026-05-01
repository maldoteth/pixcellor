// Send a marketing broadcast via Resend.
// Admin-only. Pulls recipients from the `contacts` table and/or
// past customers from `stripe_checkout_sessions`, then sends
// individual emails through the Resend gateway. Each send is
// rate-paced and logs to email_send_log.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_DEFAULT = "Pixcellor <hello@mail.pixcellor.com>";
const REPLY_TO_DEFAULT = "hello@pixcellor.com";

type Source = "contacts" | "customers" | "both";

type RequestBody = {
  action: "preview" | "send";
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  from?: string;
  replyTo?: string;
  source: Source;
  contactStatuses?: string[];      // cold/aware/warm/hot/gold
  contactIndustries?: string[];    // filter by industry
  testRecipient?: string;          // optional: test send to a single address
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const buildHtml = (subject: string, bodyHtml: string | undefined, bodyText: string | undefined, unsubUrl: string) => {
  const inner = bodyHtml && bodyHtml.trim().length > 0
    ? bodyHtml
    : `<p style="margin:0 0 16px;white-space:pre-wrap;">${escapeHtml(bodyText || "")}</p>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    ${inner}
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;">
    <p style="font-size:12px;color:#888;margin:0;">
      You're receiving this because you've worked with Pixcellor or opted in.
      <a href="${unsubUrl}" style="color:#888;">Unsubscribe</a>.
    </p>
  </div>
</body></html>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    // ----- Auth: admin only -----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const body = (await req.json()) as RequestBody;
    if (!body.action || (body.action !== "preview" && body.action !== "send"))
      return json({ error: "Invalid action" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ----- Build recipient list -----
    const recipients = new Set<string>();

    if (body.source === "contacts" || body.source === "both") {
      let q = admin.from("contacts").select("email,status,industry").not("email", "is", null);
      if (body.contactStatuses && body.contactStatuses.length > 0) q = q.in("status", body.contactStatuses);
      if (body.contactIndustries && body.contactIndustries.length > 0) q = q.in("industry", body.contactIndustries);
      const { data: contacts, error: cErr } = await q;
      if (cErr) return json({ error: cErr.message }, 500);
      contacts?.forEach((c) => {
        const e = String(c.email || "").trim().toLowerCase();
        if (isEmail(e)) recipients.add(e);
      });
    }

    if (body.source === "customers" || body.source === "both") {
      const { data: customers, error: cuErr } = await admin
        .from("stripe_checkout_sessions")
        .select("customer_email")
        .not("customer_email", "is", null);
      if (cuErr) return json({ error: cuErr.message }, 500);
      customers?.forEach((c) => {
        const e = String(c.customer_email || "").trim().toLowerCase();
        if (isEmail(e)) recipients.add(e);
      });
    }

    // Filter out suppressed
    const recipientArray = Array.from(recipients);
    if (recipientArray.length > 0) {
      const { data: suppressed } = await admin
        .from("suppressed_emails")
        .select("email")
        .in("email", recipientArray);
      const supSet = new Set((suppressed || []).map((s) => s.email.toLowerCase()));
      for (const e of supSet) recipients.delete(e);
    }

    // ----- Preview: just return the count -----
    if (body.action === "preview") {
      return json({ recipientCount: recipients.size, sample: Array.from(recipients).slice(0, 5) });
    }

    // ----- Send -----
    if (!LOVABLE_API_KEY) return json({ error: "Email gateway is not configured" }, 500);
    if (!RESEND_API_KEY) return json({ error: "Resend connection is missing" }, 500);

    const subject = String(body.subject || "").trim();
    const bodyHtml = body.bodyHtml?.trim();
    const bodyText = body.bodyText?.trim();
    if (!subject) return json({ error: "Subject is required" }, 400);
    if (!bodyHtml && !bodyText) return json({ error: "Email body is required" }, 400);

    const from = body.from?.trim() || FROM_DEFAULT;
    const replyTo = body.replyTo?.trim() || REPLY_TO_DEFAULT;

    // Test mode: only send to a single address
    let toSend = Array.from(recipients);
    if (body.testRecipient && isEmail(body.testRecipient.toLowerCase())) {
      toSend = [body.testRecipient.toLowerCase()];
    }

    if (toSend.length === 0) return json({ error: "No valid recipients found" }, 400);

    const broadcastId = crypto.randomUUID();
    let sent = 0;
    let failed = 0;
    const errors: { email: string; error: string }[] = [];

    for (const email of toSend) {
      const unsubUrl = `https://pixcellor.com/unsubscribe?token=${encodeURIComponent(broadcastId + ":" + email)}`;
      const html = buildHtml(subject, bodyHtml, bodyText, unsubUrl);
      try {
        const resp = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [email],
            subject,
            html,
            text: bodyText || undefined,
            reply_to: replyTo,
            headers: {
              "List-Unsubscribe": `<${unsubUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
            tags: [{ name: "type", value: "broadcast" }, { name: "broadcast_id", value: broadcastId }],
          }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          failed += 1;
          errors.push({ email, error: data?.message || data?.error || `HTTP ${resp.status}` });
          await admin.from("email_send_log").insert({
            message_id: `${broadcastId}:${email}`,
            template_name: "broadcast",
            recipient_email: email,
            status: "failed",
            error_message: String(data?.message || data?.error || resp.status),
            metadata: { broadcast_id: broadcastId, subject },
          });
        } else {
          sent += 1;
          await admin.from("email_send_log").insert({
            message_id: data?.id || `${broadcastId}:${email}`,
            template_name: "broadcast",
            recipient_email: email,
            status: "sent",
            metadata: { broadcast_id: broadcastId, subject, resend_id: data?.id },
          });
        }
      } catch (e) {
        failed += 1;
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ email, error: msg });
      }
      // Pace to stay under Resend free-tier 2 req/sec (~600ms gap = safe)
      await new Promise((r) => setTimeout(r, 600));
    }

    return json({ broadcastId, sent, failed, total: toSend.length, errors: errors.slice(0, 20) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Broadcast failed";
    return json({ error: message }, 500);
  }
});
