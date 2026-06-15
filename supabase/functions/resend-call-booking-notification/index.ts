import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { notifyInternalLead } from "../_shared/notify-internal-lead.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Admin auth
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
  const ids: string[] = Array.isArray(body.bookingIds) ? body.bookingIds : (body.bookingId ? [body.bookingId] : []);
  if (!ids.length) return json(400, { ok: false, error: "bookingIds required" });

  const origin = req.headers.get("origin") || "https://pixcellor.com";
  const baseUrl = origin.includes("localhost") || origin.includes("lovable") ? "https://pixcellor.com" : origin;

  const results: any[] = [];
  for (const id of ids) {
    const { data: bk, error } = await admin
      .from("call_bookings")
      .select("id, name, email, phone, company, brief, contact_id, host_token, guest_token, host_code, guest_code, source")
      .eq("id", id)
      .maybeSingle();
    if (error || !bk) { results.push({ id, ok: false, error: "not_found" }); continue; }

    const callLinkHost = `${baseUrl}/meeting/${bk.host_code}`;
    const callLinkGuest = `${baseUrl}/meeting/${bk.guest_code}`;

    await notifyInternalLead({
      sourceLabel: `Pixcellor — Call Booking (${bk.source}) [resend]`,
      leadName: bk.name,
      leadEmail: bk.email,
      leadPhone: bk.phone,
      leadMessage: [
        bk.company ? `Company: ${bk.company}` : "",
        bk.brief ? `Brief: ${bk.brief}` : "",
        `Host call link: ${callLinkHost}`,
        `Guest call link: ${callLinkGuest}`,
      ].filter(Boolean).join("\n\n"),
      contactId: bk.contact_id || bk.id,
      eventId: `resend-${bk.id}-${Date.now()}`,
    });
    results.push({ id, ok: true });
  }

  return json(200, { ok: true, results });
});
