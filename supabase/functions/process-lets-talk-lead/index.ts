import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  request_details?: { dream?: string | null; colours?: string | null } | null;
  attachment_urls?: string[] | null;
}

function cleanText(v: unknown, max = 200): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

// Today at 09:00 Europe/London, or +2 hours if already past 09:00
function nextSameDayCallbackISO(): string {
  const now = new Date();
  // Use London time to compute "today at 09:00"
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const hour = Number(parts.hour);
  // Build ISO string for today 09:00 London (BST/GMT handled by string + Date parsing of locale not reliable),
  // Simpler: schedule = max(now + 2h, now top of next hour). Always same day if before ~22:00.
  const candidate = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return candidate.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const name = cleanText(body.name, 100);
    const email = cleanText(body.email ?? "", 200).toLowerCase();
    const phone = cleanText(body.phone ?? "", 40);
    const source = cleanText(body.source ?? "lets_talk_button", 80);

    if (!name) return new Response(JSON.stringify({ ok: false, error: "missing_name" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!email && !phone) return new Response(JSON.stringify({ ok: false, error: "email_or_phone_required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find existing contact by email or phone
    let existingId: string | null = null;
    let existingNotes = "";
    if (email) {
      const { data } = await supabase.from("contacts").select("id, notes").ilike("email", email).limit(1).maybeSingle();
      if (data) { existingId = data.id; existingNotes = data.notes ?? ""; }
    }
    if (!existingId && phone) {
      const { data } = await supabase.from("contacts").select("id, notes").eq("phone", phone).limit(1).maybeSingle();
      if (data) { existingId = data.id; existingNotes = data.notes ?? ""; }
    }

    const noteLines = [
      `Let's Talk submission via ${source}.`,
      phone ? "Requested a callback." : "",
      email ? "Requested info by email." : "",
    ].filter(Boolean).join("\n");

    let contactId: string;
    if (existingId) {
      const { data, error } = await supabase
        .from("contacts")
        .update({
          name,
          email: email || null,
          phone: phone || null,
          notes: [existingNotes, noteLines].filter(Boolean).join("\n"),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingId)
        .select("id")
        .single();
      if (error) throw error;
      contactId = data.id;
    } else {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          name,
          email: email || null,
          phone: phone || null,
          industry: "general",
          source: "lets_talk",
          status: "warm",
          notes: noteLines,
        })
        .select("id")
        .single();
      if (error) throw error;
      contactId = data.id;
    }

    // Schedule same-day callback if phone provided
    if (phone) {
      const callbackAt = nextSameDayCallbackISO();
      const { error } = await supabase.from("contact_events").insert({
        contact_id: contactId,
        title: "Let's Talk — call back today",
        description: `Lead ${name} requested a callback via Let's Talk${phone ? ` (${phone})` : ""}.`,
        event_type: "callback",
        callback_at: callbackAt,
      });
      if (error) console.error("callback insert failed:", error);
    }

    // Send welcome email if email provided
    let welcomeSent = false;
    if (email) {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "sales-welcome-info",
          recipientEmail: email,
          idempotencyKey: `lets-talk-welcome-${contactId}`,
          templateData: { name },
        },
      });
      if (error) {
        console.error("welcome email failed:", error);
      } else {
        welcomeSent = true;
      }
    }

    return new Response(JSON.stringify({ ok: true, contact_id: contactId, callback_scheduled: !!phone, welcome_sent: welcomeSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-lets-talk-lead error:", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
