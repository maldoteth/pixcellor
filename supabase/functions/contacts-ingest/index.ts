import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

// Constant-time string compare
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
  const source = parsed.data.source?.trim() || "dmb_scaffolding";

  if (!email && !phone) {
    return json(400, { ok: false, error: "email_or_phone_required" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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
      source: "dmb_scaffolding",
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
    title: `Inbound from ${source}`,
    description: message || `Contact submitted via ${source}`,
    event_type: "note",
  }).then(() => {}, () => {});

  return json(200, { ok: true, contact_id: data.id });
});
