// Send a marketing broadcast through Lovable's email pipeline (same path as
// order confirmations). Each recipient is enqueued individually into the
// transactional_emails pgmq queue and the dispatcher (process-email-queue)
// handles delivery, retries, rate-limit backoff and logging.
//
// Admin-only. Pulls recipients from the `contacts` table and/or past
// customers from `stripe_checkout_sessions`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Must match send-transactional-email constants.
const SITE_NAME = "Pixcellor™";
const SENDER_DOMAIN = "notify.pixcellor.com";
const FROM_DOMAIN = "pixcellor.com";
const FROM_DEFAULT = `${SITE_NAME} <projects@${FROM_DOMAIN}>`;
const REPLY_TO_DEFAULT = `help@${FROM_DOMAIN}`;
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
  extraEmails?: string[];
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61569263824416";
const LINKEDIN_URL = "https://www.linkedin.com/company/pixcellor/";

function buildBrandedEmail(subject: string, bodyHtml: string, preheader: string, unsubUrl: string) {
  const pre = preheader.trim().slice(0, 140);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(subject)}</title>
<style>
  @media only screen and (max-width:620px){.px-container{width:100%!important}.px-pad{padding:28px 22px!important}.px-h1{font-size:24px!important;line-height:1.25!important}}
  .px-body p{margin:0 0 16px;color:#e5e5e5}
  .px-body h1{font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:700;color:#ffffff;letter-spacing:-0.02em}
  .px-body h2{font-size:22px;line-height:1.3;margin:28px 0 12px;font-weight:700;color:#ffffff;letter-spacing:-0.01em}
  .px-body h3{font-size:18px;line-height:1.35;margin:22px 0 10px;font-weight:600;color:#ffffff}
  .px-body a{color:#ffffff;text-decoration:underline}
  .px-body strong{color:#ffffff}
  .px-body ul,.px-body ol{margin:0 0 16px;padding-left:22px;color:#e5e5e5}
  .px-body li{margin:0 0 6px}
  .px-body img{max-width:100%;height:auto;border-radius:10px;display:block;margin:18px 0}
  .px-body hr{border:none;border-top:1px solid #2a2a2a;margin:28px 0}
  .px-body blockquote{margin:0 0 16px;padding:8px 16px;border-left:3px solid #ffffff;color:#bbb;font-style:italic}
  .px-btn a{background:#ffffff!important;color:#000000!important;text-decoration:none!important;padding:14px 30px!important;border-radius:999px!important;display:inline-block!important;font-weight:600!important;font-size:15px!important;letter-spacing:-0.01em}
</style>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;-webkit-font-smoothing:antialiased;">
<div style="display:none;font-size:1px;color:#000000;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" class="px-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#000000;">
      <tr><td style="padding:8px 24px 0;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td class="px-pad px-body" style="padding:28px 40px 36px;font-size:16px;line-height:1.7;color:#e5e5e5;">
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:0 40px 36px;">
        <hr style="border:none;border-top:1px solid #1f1f1f;margin:0 0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="font-size:12px;line-height:1.7;color:#777;">
            <div style="margin:0 0 8px;font-weight:600;color:#ffffff;font-size:13px;letter-spacing:-0.01em;">Pixcellor™</div>
            <div style="margin:0 0 14px;color:#999;">Premium creative studio for brands that care about detail.</div>
            <div style="margin:0 0 14px;">
              <a href="${LINKEDIN_URL}" style="color:#aaa;text-decoration:none;margin:0 8px;">LinkedIn</a>·
              <a href="${FACEBOOK_URL}" style="color:#aaa;text-decoration:none;margin:0 8px;">Facebook</a>·
              <a href="mailto:help@pixcellor.com" style="color:#aaa;text-decoration:none;margin:0 8px;">help@pixcellor.com</a>
            </div>
            <div style="margin:0 0 12px;color:#666;">United Kingdom</div>
            <div style="color:#666;">You're receiving this because you've worked with Pixcellor or opted in.<br>
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

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    if (Array.isArray(body.extraEmails)) {
      body.extraEmails.forEach((raw) => {
        const e = String(raw || "").trim().toLowerCase();
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
    let queued = 0;
    let failed = 0;
    const errors: { email: string; error: string }[] = [];

    for (const email of toSend) {
      try {
        // Get or create unsubscribe token (one per email).
        let unsubscribeToken: string | null = null;
        const { data: existingToken } = await admin
          .from("email_unsubscribe_tokens")
          .select("token, used_at")
          .eq("email", email)
          .maybeSingle();
        if (existingToken && !existingToken.used_at) {
          unsubscribeToken = existingToken.token;
        } else if (!existingToken) {
          const newToken = generateToken();
          await admin
            .from("email_unsubscribe_tokens")
            .upsert({ token: newToken, email }, { onConflict: "email", ignoreDuplicates: true });
          const { data: stored } = await admin
            .from("email_unsubscribe_tokens")
            .select("token")
            .eq("email", email)
            .maybeSingle();
          unsubscribeToken = stored?.token ?? newToken;
        } else {
          // Token already used → recipient unsubscribed; skip.
          await admin.from("email_send_log").insert({
            message_id: `${broadcastId}:${email}`,
            template_name: "broadcast",
            recipient_email: email,
            status: "suppressed",
            metadata: { broadcast_id: broadcastId, subject },
          });
          continue;
        }

        const unsubUrl = `${SITE}/unsubscribe?token=${encodeURIComponent(unsubscribeToken!)}`;
        const html = buildBrandedEmail(subject, innerHtml, preheader, unsubUrl);
        const messageId = crypto.randomUUID();

        // Log pending then enqueue (same pattern as send-transactional-email).
        await admin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "broadcast",
          recipient_email: email,
          status: "pending",
          metadata: { broadcast_id: broadcastId, subject, reply_to: replyTo },
        });

        const { error: enqueueError } = await admin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            to: email,
            from,
            reply_to: replyTo,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text: plainFallback || undefined,
            purpose: "transactional",
            label: "broadcast",
            idempotency_key: `${broadcastId}:${email}`,
            unsubscribe_token: unsubscribeToken,
            email_log_metadata: { broadcast_id: broadcastId, subject, reply_to: replyTo },
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) {
          failed += 1;
          errors.push({ email, error: enqueueError.message });
          await admin.from("email_send_log").insert({
            message_id: messageId,
            template_name: "broadcast",
            recipient_email: email,
            status: "failed",
            error_message: enqueueError.message,
            metadata: { broadcast_id: broadcastId, subject },
          });
        } else {
          queued += 1;
        }
      } catch (e) {
        failed += 1;
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ email, error: msg });
      }
    }

    return json({
      broadcastId,
      sent: queued, // for backwards-compat with the UI; emails are queued and dispatched within seconds
      queued,
      failed,
      total: toSend.length,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Broadcast failed";
    return json({ error: message }, 500);
  }
});
