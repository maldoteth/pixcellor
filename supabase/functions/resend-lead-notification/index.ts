import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CUSTOMER_WEBSITES: Record<string, { label: string; notifyEmail: string }> = {
  dmb_scaffolding: { label: "DMB Scaffolding", notifyEmail: "dmbscaffoldingltd@outlook.com" },
  set_in_stone_southern: { label: "Set In Stone Southern LTD", notifyEmail: "setinstoneltd@outlook.com" },
  set_in_stone_tiling: { label: "Set In Stone Tiling LTD", notifyEmail: "setinstoneltd@outlook.com" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Require admin auth via caller JWT
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json(401, { ok: false, error: "unauthorized" });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json(403, { ok: false, error: "forbidden" });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }
  const contactId = body.contactId;
  if (!contactId) return json(400, { ok: false, error: "contactId required" });

  const { data: contact, error: cErr } = await admin
    .from("contacts")
    .select("id, name, contact_name, email, phone, notes, source")
    .eq("id", contactId)
    .maybeSingle();
  if (cErr || !contact) return json(404, { ok: false, error: "contact_not_found" });

  const website = CUSTOMER_WEBSITES[contact.source] ?? { label: contact.source, notifyEmail: "" };
  if (!website.notifyEmail) return json(400, { ok: false, error: "no_notify_email_for_source", source: contact.source });

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      templateName: "customer-lead-notification",
      recipientEmail: website.notifyEmail,
      idempotencyKey: `lead-notify-resend-${contact.id}`,
      templateData: {
        customerWebsiteName: website.label,
        leadName: contact.contact_name || contact.name || "",
        leadEmail: contact.email || "",
        leadPhone: contact.phone || "",
        leadMessage: contact.notes || "",
        receivedAt: new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }),
      },
    }),
  });
  const text = await resp.text();
  return json(resp.ok ? 200 : 500, { ok: resp.ok, status: resp.status, body: text });
});
