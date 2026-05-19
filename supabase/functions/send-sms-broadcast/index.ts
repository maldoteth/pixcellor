import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
import { z } from "npm:zod@3";

const BodySchema = z.object({
  title: z.string().max(160).optional(),
  body: z.string().min(1).max(640),
  sender_id: z.string().max(40).optional(),
  scheduled_for: z.string().datetime().optional(),
  recipients: z
    .array(
      z.object({
        contact_id: z.string().uuid().optional(),
        contact_person_id: z.string().uuid().optional(),
        phone: z.string().min(5).max(40),
      })
    )
    .min(1)
    .max(20000),
});

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.replace(/[^\d+]/g, "");
  if (!p) return null;
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (!p.startsWith("+")) {
    // assume UK if starts with 0
    if (p.startsWith("0")) p = "+44" + p.slice(1);
    else p = "+" + p;
  }
  return /^\+\d{7,15}$/.test(p) ? p : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const email = (claimsData.claims.email as string | undefined) ?? null;

    // Verify admin
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { title, body, sender_id, scheduled_for, recipients } = parsed.data;

    // Service-role client for inserts
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Settings (footer + default sender)
    const { data: settings } = await admin
      .from("sms_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const footer = settings?.footer || "Reply STOP to opt out";
    const finalSender = sender_id || settings?.sender_id || null;
    if (!finalSender) {
      return new Response(
        JSON.stringify({ error: "No sender_id configured. Set one in SMS settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const fullBody = `${body.trim()}\n${footer}`.slice(0, 1600);

    // Load opt-outs
    const { data: optOuts } = await admin.from("sms_opt_outs").select("phone");
    const optOutSet = new Set((optOuts ?? []).map((r: { phone: string }) => r.phone));

    // Normalize + dedupe + filter opt-outs
    const seen = new Set<string>();
    const cleanRecipients: { contact_id?: string; contact_person_id?: string; phone: string }[] = [];
    for (const r of recipients) {
      const n = normalizePhone(r.phone);
      if (!n) continue;
      if (optOutSet.has(n)) continue;
      if (seen.has(n)) continue;
      seen.add(n);
      cleanRecipients.push({ ...r, phone: n });
    }

    if (cleanRecipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid recipients after dedupe and opt-out filter." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create broadcast
    const { data: broadcast, error: bErr } = await admin
      .from("sms_broadcasts")
      .insert({
        title: title ?? null,
        body: fullBody,
        sender_id: finalSender,
        status: scheduled_for ? "queued" : "queued",
        recipient_count: cleanRecipients.length,
        scheduled_for: scheduled_for ?? null,
        created_by_user_id: userId,
        created_by_email: email,
      })
      .select()
      .single();
    if (bErr || !broadcast) throw new Error(bErr?.message || "Failed to create broadcast");

    // Insert queued sms_messages in chunks
    const rows = cleanRecipients.map((r) => ({
      broadcast_id: broadcast.id,
      contact_id: r.contact_id ?? null,
      contact_person_id: r.contact_person_id ?? null,
      to_phone: r.phone,
      from_phone: finalSender,
      direction: "outbound",
      status: "queued",
      body: fullBody,
    }));

    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const { error: mErr } = await admin.from("sms_messages").insert(rows.slice(i, i + chunkSize));
      if (mErr) throw new Error(mErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        broadcast_id: broadcast.id,
        recipient_count: cleanRecipients.length,
        skipped: recipients.length - cleanRecipients.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-sms-broadcast error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
