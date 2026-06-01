import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Customer website registry — add new customer websites here.
// `source` keys are stored on contacts.source; they drive labels in the CRM
// and the notification email recipient.
const CUSTOMER_WEBSITES: Record<string, { label: string; notifyEmail: string }> = {
  dmb_scaffolding: {
    label: "DMB Scaffolding",
    notifyEmail: "dmbscaffoldingltd@outlook.com",
  },
};

const BodySchema = z.object({
  source: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(255).optional(),
  message: z.string().trim().max(4000).optional(),
}).passthrough();

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const safeEq = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  const secret = Deno.env.get("INGEST_SECRET");
  if (!secret) return json(500, { ok: false, error: "ingest_secret_not_configured" });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ") || !safeEq(auth.slice(7).trim(), secret)) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, { ok: false, error: "invalid_input", fields: parsed.error.flatten().fieldErrors });
  }
  const { name, phone, email, message } = parsed.data;
  const sourceKey = (parsed.data.source?.trim() || "dmb_scaffolding").toLowerCase();
  const customerWebsite = CUSTOMER_WEBSITES[sourceKey] ?? { label: sourceKey, notifyEmail: "" };

  if (!email && !phone) {
    return json(400, { ok: false, error: "email_or_phone_required" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const displayName = name || email || phone || "Unknown";
  const notes = message ? message.slice(0, 4000) : null;

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: displayName,
      contact_name: name || null,
      email: email ? email.toLowerCase() : null,
      phone: phone || null,
      industry: "general",
      source: sourceKey,
      status: "new",
      notes,
    })
    .select("id")
    .single();

  if (error) {
    console.error("contacts-ingest insert error:", error);
    return json(500, { ok: false, error: "insert_failed", detail: error.message });
  }

  // Best-effort timeline event
  await supabase.from("contact_events").insert({
    contact_id: data.id,
    title: `Inbound from ${customerWebsite.label}`,
    description: message || `Contact submitted via ${customerWebsite.label}`,
    event_type: "note",
  }).then(() => {}, () => {});

  // Best-effort customer notification email
  if (customerWebsite.notifyEmail) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          templateName: "customer-lead-notification",
          recipientEmail: customerWebsite.notifyEmail,
          idempotencyKey: `lead-notify-${data.id}`,
          templateData: {
            customerWebsiteName: customerWebsite.label,
            leadName: name || "",
            leadEmail: email || "",
            leadPhone: phone || "",
            leadMessage: message || "",
            receivedAt: new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }),
          },
        }),
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        console.warn("customer notification email failed:", resp.status, t);
      }
    } catch (e) {
      console.warn("customer notification email error:", e);
    }
  }

  return json(200, { ok: true, contact_id: data.id });
});
