import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { notifyInternalLead } from "../_shared/notify-internal-lead.ts";

const BodySchema = z.object({
  company: z.string().max(2000).optional().nullable(),
  name: z.string().max(2000).optional().nullable(),
  email: z.string().max(2000).optional().nullable(),
  phone: z.string().max(2000).optional().nullable(),
  visitor_id: z.string().max(2000).optional().nullable(),
  stage: z.string().max(200).optional().nullable(),
}).passthrough();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Progressive lead capture for the AI Vision Generator.
 * As soon as a visitor has entered (company OR name) AND (email OR phone),
 * we upsert them into `contacts` so they show up under Clients as a hot lead.
 * Subsequent calls update the same contact with any new fields they add.
 *
 * NOTE: contacts.name = company / brand. contacts.contact_name = person's name.
 * The contacts table has NO `company` column.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsedBody = BodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return new Response(JSON.stringify({ ok: false, reason: "invalid_input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = parsedBody.data;
    const cleanStr = (v: unknown, max = 200) =>
      (typeof v === "string" ? v.trim().slice(0, max) : null) || null;

    const company = cleanStr(body?.company, 200);
    const name = cleanStr(body?.name, 200);
    const emailRaw = cleanStr(body?.email, 200);
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const phone = cleanStr(body?.phone, 40);
    const visitorId = cleanStr(body?.visitor_id, 200);
    const stage = cleanStr(body?.stage, 80) ?? "in_progress";

    // Need at least one identifier (email OR phone) AND at least one descriptor (company OR name).
    if (!email && !phone) {
      return new Response(JSON.stringify({ ok: false, reason: "no_contact" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!company && !name) {
      return new Response(JSON.stringify({ ok: false, reason: "no_descriptor" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ ok: false, reason: "bad_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find existing by email first, then phone
    let existing: {
      id: string;
      status: string | null;
      name: string | null;
      email: string | null;
      phone: string | null;
      contact_name: string | null;
      notes: string | null;
    } | null = null;

    if (email) {
      const { data } = await supabase
        .from("contacts")
        .select("id,status,name,email,phone,contact_name,notes")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      existing = data ?? null;
    }
    if (!existing && phone) {
      const { data } = await supabase
        .from("contacts")
        .select("id,status,name,email,phone,contact_name,notes")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();
      existing = data ?? null;
    }

    const today = new Date().toISOString().slice(0, 10);
    // Only meaningful milestones get a note line — no spam per stage change
    const milestoneNote =
      stage === "result"
        ? `AI sample generated for ${company || name} — ${today}`
        : null;

    if (existing) {
      const protectedStatus = existing.status === "gold" || existing.status === "archived";
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (!protectedStatus && existing.status !== "hot") {
        patch.status = stage === "result" ? "hot" : "warm";
      }
      if (!existing.email && email) patch.email = email;
      if (!existing.phone && phone) patch.phone = phone;
      if ((!existing.contact_name || existing.contact_name.trim() === "") && name) {
        patch.contact_name = name;
      }
      // contacts.name holds company / brand — only fill or upgrade from a generic placeholder
      if (
        (!existing.name || existing.name.trim() === "" || existing.name === "AI sample lead") &&
        (company || name)
      ) {
        patch.name = company || name;
      }
      // Only append a milestone note (e.g. when sample is generated), and only once
      if (milestoneNote && !existing.notes?.includes(milestoneNote)) {
        patch.notes = existing.notes ? `${existing.notes}\n${milestoneNote}` : milestoneNote;
      }
      const { error } = await supabase.from("contacts").update(patch).eq("id", existing.id);
      if (error) {
        console.error("contacts update failed", error);
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, contactId: existing.id, action: "updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const initialNote = `AI Vision Generator lead — started ${today}${visitorId ? ` · visitor ${visitorId}` : ""}${milestoneNote ? `\n${milestoneNote}` : ""}`;

    const { data: inserted, error: insErr } = await supabase
      .from("contacts")
      .insert({
        name: company || name || "AI sample lead",
        contact_name: name,
        email,
        phone,
        status: stage === "result" ? "hot" : "warm",
        source: "ai_vision_generator",
        industry: "general",
        notes: initialNote,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("contacts insert failed", insErr);
      return new Response(JSON.stringify({ ok: false, error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, contactId: inserted?.id, action: "created" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("save-vision-lead error", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
