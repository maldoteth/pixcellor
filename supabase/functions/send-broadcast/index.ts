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
const LOGO_URL = "https://pixcellor.com/pixcellor-email-logo.png";
const SITE = "https://pixcellor.com";

type Source = "contacts" | "customers" | "both";

type RequestBody = {
  action: "preview" | "send";
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  preheader?: string;
  from?: string;
  replyTo?: string;
  source: Source;
  contactStatuses?: string[];
  contactIndustries?: string[];
  testRecipient?: string;
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- Branded email shell (kept in sync with src/components/email/emailTemplate.ts) ----
function buildBrandedEmail(subject: string, bodyHtml: string, preheader: string, unsubUrl: string) {
  const pre = preheader.trim().slice(0, 140);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(subject)}</title>
<style>
  @media only screen and (max-width:620px){.px-container{width:100%!important}.px-pad{padding:24px 20px!important}.px-h1{font-size:24px!important;line-height:1.25!important}}
  .px-body p{margin:0 0 16px}
  .px-body h1{font-size:26px;line-height:1.25;margin:0 0 16px;font-weight:700;color:#0a0a0a;letter-spacing:-0.01em}
  .px-body h2{font-size:20px;line-height:1.3;margin:24px 0 12px;font-weight:700;color:#0a0a0a;letter-spacing:-0.01em}
  .px-body h3{font-size:17px;line-height:1.35;margin:20px 0 10px;font-weight:600;color:#0a0a0a}
  .px-body a{color:#0a0a0a;text-decoration:underline}
  .px-body ul,.px-body ol{margin:0 0 16px;padding-left:22px}
  .px-body li{margin:0 0 6px}
  .px-body img{max-width:100%;height:auto;border-radius:8px;display:block;margin:16px 0}
  .px-body hr{border:none;border-top:1px solid #e5e5e5;margin:28px 0}
  .px-body blockquote{margin:0 0 16px;padding:8px 16px;border-left:3px solid #0a0a0a;color:#444;font-style:italic}
  .px-btn a{background:#0a0a0a!important;color:#ffffff!important;text-decoration:none!important;padding:14px 28px!important;border-radius:999px!important;display:inline-block!important;font-weight:600!important;font-size:15px!important}
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a;-webkit-font-smoothing:antialiased;">
<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" class="px-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <tr><td align="center" style="padding:32px 24px 8px;">
        <a href="${SITE}" style="text-decoration:none;color:#0a0a0a;">
          <img src="${LOGO_URL}" alt="Pixcellor" width="140" style="display:block;border:0;outline:none;height:auto;max-width:140px;">
        </a>
      </td></tr>
      <tr><td class="px-pad px-body" style="padding:24px 40px 32px;font-size:16px;line-height:1.65;color:#1a1a1a;">
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:0 40px 32px;">
        <hr style="border:none;border-top:1px solid #ececec;margin:0 0 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="font-size:12px;line-height:1.6;color:#888;">
            <div style="margin:0 0 8px;font-weight:600;color:#0a0a0a;">Pixcellor™</div>
            <div style="margin:0 0 12px;">Premium product photography &amp; web design.</div>
            <div style="margin:0 0 12px;">
              <a href="https://www.linkedin.com/company/pixcellor/" style="color:#888;text-decoration:none;margin:0 6px;">LinkedIn</a>·
              <a href="https://www.instagram.com/pixcellor" style="color:#888;text-decoration:none;margin:0 6px;">Instagram</a>·
              <a href="https://www.facebook.com/pixcellor" style="color:#888;text-decoration:none;margin:0 6px;">Facebook</a>
            </div>
            <div style="margin:0 0 8px;color:#aaa;">United Kingdom</div>
            <div>You're receiving this because you've worked with Pixcellor or opted in.<br>
              <a href="${unsubUrl}" style="color:#888;text-decoration:underline;">Unsubscribe</a>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
    <div style="height:32px;line-height:32px;">&nbsp;</div>
  </td></tr>
</table>
</body></html>`;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

    const recipientArray = Array.from(recipients);
    if (recipientArray.length > 0) {
      const { data: suppressed } = await admin
        .from("suppressed_emails")
        .select("email")
        .in("email", recipientArray);
      const supSet = new Set((suppressed || []).map((s) => s.email.toLowerCase()));
      for (const e of supSet) recipients.delete(e);
    }

    if (body.action === "preview") {
      return json({ recipientCount: recipients.size, sample: Array.from(recipients).slice(0, 5) });
    }

    // ----- Send -----
    if (!LOVABLE_API_KEY) return json({ error: "Email gateway is not configured" }, 500);
    if (!RESEND_API_KEY) return json({ error: "Resend connection is missing" }, 500);

    const subject = String(body.subject || "").trim();
    const rawHtml = (body.bodyHtml || "").trim();
    const rawText = (body.bodyText || "").trim();
    if (!subject) return json({ error: "Subject is required" }, 400);
    if (!rawHtml && !rawText) return json({ error: "Email body is required" }, 400);

    const innerHtml = rawHtml || `<p style="margin:0 0 16px;white-space:pre-wrap;">${escapeHtml(rawText)}</p>`;
    const plainFallback = rawText || htmlToPlainText(rawHtml);
    const preheader = (body.preheader || plainFallback).slice(0, 140);

    const from = body.from?.trim() || FROM_DEFAULT;
    const replyTo = body.replyTo?.trim() || REPLY_TO_DEFAULT;

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
      const html = buildBrandedEmail(subject, innerHtml, preheader, unsubUrl);
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
            text: plainFallback || undefined,
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
      await new Promise((r) => setTimeout(r, 600));
    }

    return json({ broadcastId, sent, failed, total: toSend.length, errors: errors.slice(0, 20) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Broadcast failed";
    return json({ error: message }, 500);
  }
});
