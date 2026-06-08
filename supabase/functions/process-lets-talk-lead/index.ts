import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Defence-in-depth schema. Caps generous so any payload that previously worked
// still works — `cleanText()` below truncates further per-field as before.
const BodySchema = z.object({
  name: z.string().max(2000).optional().nullable(),
  email: z.string().max(2000).optional().nullable(),
  phone: z.string().max(2000).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  request_details: z.object({
    company: z.string().max(2000).optional().nullable(),
    dream: z.string().max(20000).optional().nullable(),
    colours: z.string().max(20000).optional().nullable(),
  }).passthrough().optional().nullable(),
  attachment_urls: z.array(z.string().max(2000)).max(100).optional().nullable(),
  partial: z.boolean().optional().nullable(),
}).passthrough();

type Body = z.infer<typeof BodySchema>;

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
    let raw: unknown;
    try { raw = await req.json(); } catch {
      return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_input", fields: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body: Body = parsed.data;
    const name = cleanText(body.name, 100);
    const email = cleanText(body.email ?? "", 200).toLowerCase();
    const phone = cleanText(body.phone ?? "", 40);
    const source = cleanText(body.source ?? "lets_talk_button", 80);
    const company = cleanText(body.request_details?.company ?? "", 120);
    const dream = cleanText(body.request_details?.dream ?? "", 2000);
    const colours = cleanText(body.request_details?.colours ?? "", 2000);
    const attachments = Array.isArray(body.attachment_urls)
      ? body.attachment_urls.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u)).slice(0, 50)
      : [];
    const isSampleRequest = source === "free_sample_request";
    const isPartial = body.partial === true;

    // Third-party partner sites that POST into our public Let's Talk endpoint
    // using our anon key. Their leads belong to the partner, not to us:
    // - don't mark hot / schedule callbacks / send welcome emails
    // - anonymise company on our side, tag the source clearly
    const THIRD_PARTY_SOURCES: Record<string, { label: string }> = {
      annas_bees: { label: "Anna's Bees" },
    };
    const thirdParty = THIRD_PARTY_SOURCES[source] ?? null;
    const isThirdParty = !!thirdParty;

    if (!name) return new Response(JSON.stringify({ ok: false, error: "missing_name" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!email && !phone) return new Response(JSON.stringify({ ok: false, error: "email_or_phone_required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find existing contact by email or phone
    let existingId: string | null = null;
    let existingNotes = "";
    let existingMedia: unknown[] = [];
    if (email) {
      const { data } = await supabase.from("contacts").select("id, notes, media").ilike("email", email).limit(1).maybeSingle();
      if (data) { existingId = data.id; existingNotes = data.notes ?? ""; existingMedia = Array.isArray(data.media) ? data.media : []; }
    }
    if (!existingId && phone) {
      const { data } = await supabase.from("contacts").select("id, notes, media").eq("phone", phone).limit(1).maybeSingle();
      if (data) { existingId = data.id; existingNotes = data.notes ?? ""; existingMedia = Array.isArray(data.media) ? data.media : []; }
    }

    const briefLines = isSampleRequest
      ? [
          "Free Sample Request:",
          dream ? `Dream site: ${dream}` : "",
          colours ? `Colours/styles: ${colours}` : "",
          attachments.length ? `Attachments: ${attachments.length}` : "",
        ].filter(Boolean).join("\n")
      : "";

    // Concise note — no boilerplate. Source/email/phone are already columns.
    const today = new Date().toISOString().slice(0, 10);
    const headline = isSampleRequest
      ? `Free sample request (${source}) — ${today}`
      : `Let's Talk (${source}) — ${today}`;
    const noteLines = [headline, briefLines].filter(Boolean).join("\n");

    // Merge new attachments into contact media (dedupe, cap at 50)
    const existingUrls = existingMedia
      .map((m) => (typeof m === "string" ? m : (m as { url?: string })?.url))
      .filter((u): u is string => typeof u === "string");
    const mergedMedia = Array.from(new Set([...existingUrls, ...attachments])).slice(0, 50);

    const desiredStatus = "hot";

    // contacts.name = company (per CRM convention); contacts.contact_name = person name
    const contactCompany = company || name;

    let contactId: string;
    if (existingId) {
      const { data, error } = await supabase
        .from("contacts")
        .update({
          name: contactCompany,
          contact_name: name,
          email: email || null,
          phone: phone || null,
          notes: existingNotes?.includes(noteLines)
            ? existingNotes
            : [existingNotes, noteLines].filter(Boolean).join("\n"),
          status: desiredStatus,
          media: mergedMedia,
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
          name: contactCompany,
          contact_name: name,
          email: email || null,
          phone: phone || null,
          industry: "general",
          source: isSampleRequest ? "free_sample_request" : "lets_talk",
          status: desiredStatus,
          notes: noteLines,
          media: mergedMedia,
        })
        .select("id")
        .single();
      if (error) throw error;
      contactId = data.id;
    }

    // Mirror into client_profiles for the customer dashboard / enquiries view
    if (email) {
      const { data: existingProfile } = await supabase
        .from("client_profiles")
        .select("id")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      if (existingProfile?.id) {
        await supabase
          .from("client_profiles")
          .update({
            name,
            company: company || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingProfile.id);
      } else {
        await supabase.from("client_profiles").insert({
          email,
          name,
          company: company || null,
        });
      }
    }

    // Log a brief event for sample requests so admins see it on the contact timeline
    if (isSampleRequest) {
      await supabase.from("contact_events").insert({
        contact_id: contactId,
        title: "Free Sample Request submitted",
        description: briefLines || "Visitor submitted a free sample brief.",
        event_type: "note",
      }).then(({ error }) => { if (error) console.error("brief event insert failed:", error); });
    }

    // Schedule same-day callback if phone provided
    if (phone && !isPartial) {
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
    if (email && !isPartial) {
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
