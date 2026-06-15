import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { notifyInternalLead } from "../_shared/notify-internal-lead.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const PREFERENCES = ["specific", "anytime", "mornings", "afternoons", "evenings"] as const;

const BodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(40).regex(/^[0-9+()\-\s]+$/),
  company: z.string().trim().max(160).optional().nullable(),
  brief: z.string().trim().max(1000).optional().nullable(),
  preference: z.enum(PREFERENCES),
  scheduled_at: z.string().datetime().optional().nullable(),
  source: z.string().trim().max(80).optional().nullable(),
  hp: z.string().optional().nullable(), // honeypot
}).superRefine((val, ctx) => {
  if (val.preference === "specific" && !val.scheduled_at) {
    ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "scheduled_at required for specific preference" });
  }
});

function formatLondon(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d) + " (UK time)";
}

function preferenceLabel(p: string): string {
  switch (p) {
    case "anytime": return "Call back anytime";
    case "mornings": return "Call back any morning (09:00–12:00 UK)";
    case "afternoons": return "Call back any afternoon (12:00–17:00 UK)";
    case "evenings": return "Call back any evening (17:00–20:00 UK)";
    default: return "Scheduled call";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // GET ?action=availability&from=ISO&to=ISO  -> list booked slots in window
  if (req.method === "GET") {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!from || !to) {
      return new Response(JSON.stringify({ ok: false, error: "missing_range" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data, error } = await supabase
      .from("call_bookings")
      .select("scheduled_at")
      .not("scheduled_at", "is", null)
      .neq("status", "cancelled")
      .gte("scheduled_at", from)
      .lte("scheduled_at", to);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      booked: (data ?? []).map((r) => r.scheduled_at),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405, headers: corsHeaders });
  }

  try {
    let raw: unknown;
    try { raw = await req.json(); } catch {
      return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_input", fields: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const b = parsed.data;

    // Honeypot — silently succeed for bots
    if (b.hp && b.hp.trim().length > 0) {
      return new Response(JSON.stringify({ ok: true, bot: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If specific time: ensure it's at least 36 hours in the future
    if (b.preference === "specific" && b.scheduled_at) {
      const t = new Date(b.scheduled_at).getTime();
      const minLeadMs = 36 * 60 * 60 * 1000;
      if (!Number.isFinite(t) || t < Date.now() + minLeadMs - 60_000) {
        return new Response(JSON.stringify({ ok: false, error: "slot_too_soon" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const source = (b.source || "ads_landing").slice(0, 80);

    // Insert booking — unique index prevents double-booking specific slots
    const { data: booking, error: insertErr } = await supabase
      .from("call_bookings")
      .insert({
        name: b.name,
        email: b.email.toLowerCase(),
        phone: b.phone,
        company: b.company || null,
        brief: b.brief || null,
        preference: b.preference,
        scheduled_at: b.preference === "specific" ? b.scheduled_at : null,
        source,
      })
      .select("id, host_token, guest_token")
      .single();

    if (insertErr) {
      const msg = String(insertErr.message || "");
      if (msg.includes("call_bookings_unique_slot") || (insertErr as any).code === "23505") {
        return new Response(JSON.stringify({ ok: false, error: "slot_taken" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("call booking insert failed:", insertErr);
      return new Response(JSON.stringify({ ok: false, error: "insert_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bookingId = booking.id;
    const whenLabel = b.preference === "specific" && b.scheduled_at ? formatLondon(b.scheduled_at) : "";
    const prefLabel = preferenceLabel(b.preference);

    // Public site origin for call links
    const siteOrigin = Deno.env.get("PUBLIC_SITE_URL") || "https://pixcellor.com";
    const callLinkGuest = b.preference === "specific"
      ? `${siteOrigin}/call/${bookingId}?t=${booking.guest_token}`
      : "";
    const callLinkHost = `${siteOrigin}/call/${bookingId}?t=${booking.host_token}`;

    // Mirror into contacts CRM
    let contactId: string | null = null;
    try {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id, notes")
        .ilike("email", b.email)
        .limit(1)
        .maybeSingle();

      const today = new Date().toISOString().slice(0, 10);
      const noteLines = [
        `Call booked (${source}) — ${today}`,
        whenLabel ? `When: ${whenLabel}` : `Preference: ${prefLabel}`,
        b.brief ? `Brief: ${b.brief}` : "",
      ].filter(Boolean).join("\n");

      if (existing?.id) {
        await supabase.from("contacts").update({
          contact_name: b.name,
          phone: b.phone,
          status: "hot",
          notes: [existing.notes, noteLines].filter(Boolean).join("\n"),
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        contactId = existing.id;
      } else {
        const { data: ins } = await supabase.from("contacts").insert({
          name: b.company || b.name,
          contact_name: b.name,
          email: b.email.toLowerCase(),
          phone: b.phone,
          industry: "general",
          source: "call_booking",
          status: "hot",
          notes: noteLines,
        }).select("id").single();
        contactId = ins?.id ?? null;
      }

      // Timeline event with callback time
      if (contactId) {
        await supabase.from("contact_events").insert({
          contact_id: contactId,
          title: whenLabel ? `Call scheduled — ${whenLabel}` : `Callback requested — ${prefLabel}`,
          description: b.brief || "",
          event_type: "callback",
          callback_at: b.preference === "specific" ? b.scheduled_at : null,
        });

        await supabase.from("call_bookings").update({ contact_id: contactId }).eq("id", bookingId);
      }
    } catch (e) {
      console.warn("contact mirror failed:", e);
    }

    // Send confirmation email to the customer
    let emailSent = false;
    try {
      const { error: emailErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "call-booking-confirmation",
          recipientEmail: b.email,
          idempotencyKey: `call-booking-${bookingId}`,
          templateData: {
            name: b.name,
            whenLabel,
            preferenceLabel: prefLabel,
            phone: b.phone,
            brief: b.brief || "",
            callLink: callLinkGuest,
          },
        },
      });
      if (emailErr) console.warn("confirmation email failed:", emailErr);
      else emailSent = true;
    } catch (e) {
      console.warn("confirmation email error:", e);
    }

    // Internal team notification
    notifyInternalLead({
      sourceLabel: `Pixcellor — Call Booking (${source})`,
      leadName: b.name,
      leadEmail: b.email,
      leadPhone: b.phone,
      leadMessage: [
        b.company ? `Company: ${b.company}` : "",
        b.brief ? `Brief: ${b.brief}` : "",
        `Host call link: ${callLinkHost}`,
        callLinkGuest ? `Guest call link: ${callLinkGuest}` : "",
      ].filter(Boolean).join("\n\n"),
      contactId: contactId || bookingId,
      eventId: bookingId,
    }).catch((e) => console.warn("internal notify failed:", e));

    // Do NOT include call_link_host in the response — that link contains the
    // host token. It is only sent internally to the Pixcellor team above.
    return new Response(JSON.stringify({
      ok: true,
      booking_id: bookingId,
      when_label: whenLabel,
      preference_label: prefLabel,
      email_sent: emailSent,
      call_link_guest: callLinkGuest,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("book-call error:", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
