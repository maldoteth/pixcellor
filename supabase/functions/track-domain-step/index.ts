import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  packageName?: string;
  billing?: string;
  visitorId?: string;
  sessionId?: string;
  pageUrl?: string;
}

const clean = (v: unknown, max = 200) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const name = clean(body.name, 100);
    const email = clean(body.email, 200).toLowerCase();
    const phone = clean(body.phone, 40);
    const company = clean(body.company, 120);
    const packageName = clean(body.packageName, 80);
    const billing = clean(body.billing, 40);
    const visitorId = clean(body.visitorId, 200);
    const sessionId = clean(body.sessionId, 200);
    const pageUrl = clean(body.pageUrl, 500);

    if (!email && !phone) {
      return new Response(
        JSON.stringify({ ok: false, error: "email_or_phone_required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find existing contact by email or phone
    let existingId: string | null = null;
    let existingNotes = "";
    if (email) {
      const { data } = await supabase
        .from("contacts")
        .select("id, notes")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      if (data) { existingId = data.id; existingNotes = data.notes ?? ""; }
    }
    if (!existingId && phone) {
      const { data } = await supabase
        .from("contacts")
        .select("id, notes")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();
      if (data) { existingId = data.id; existingNotes = data.notes ?? ""; }
    }

    const stepNote = [
      `Reached domain selection step${packageName ? ` for ${packageName}` : ""}${billing ? ` (${billing})` : ""}.`,
      "Has not yet completed checkout.",
    ].join(" ");

    let contactId: string;
    if (existingId) {
      const merged = [existingNotes, stepNote].filter(Boolean).join("\n");
      const { data, error } = await supabase
        .from("contacts")
        .update({
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
          status: "hot",
          notes: merged.slice(0, 4000),
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
          name: name || company || email || phone || "Unknown",
          contact_name: name || null,
          email: email || null,
          phone: phone || null,
          industry: "general",
          source: "domain_picker",
          status: "hot",
          notes: stepNote,
        })
        .select("id")
        .single();
      if (error) throw error;
      contactId = data.id;
    }

    // Timeline event
    await supabase.from("contact_events").insert({
      contact_id: contactId,
      title: "Reached domain step (no purchase yet)",
      description: [
        packageName ? `Package: ${packageName}` : "",
        billing ? `Billing: ${billing}` : "",
        company ? `Company: ${company}` : "",
        pageUrl ? `Page: ${pageUrl}` : "",
      ].filter(Boolean).join("\n") || "Visitor reached the domain picker but did not complete checkout.",
      event_type: "note",
    });

    // Record falloff
    if (visitorId && sessionId && visitorId.length >= 8 && sessionId.length >= 8) {
      const { data: existing } = await supabase
        .from("visitor_falloffs")
        .select("metadata, event_count")
        .eq("visitor_id", visitorId)
        .eq("session_id", sessionId)
        .maybeSingle();
      const meta = (existing?.metadata && typeof existing.metadata === "object")
        ? existing.metadata as Record<string, unknown>
        : {};
      await supabase.from("visitor_falloffs").upsert({
        visitor_id: visitorId,
        session_id: sessionId,
        last_page: pageUrl || null,
        package_name: packageName || null,
        billing: billing || null,
        customer_email: email || null,
        last_seen_at: new Date().toISOString(),
        event_count: (existing?.event_count ?? 0) + 1,
        metadata: {
          ...meta,
          domain_step_reached_at: new Date().toISOString(),
          domain_step_contact_id: contactId,
          buyer_name: name,
          buyer_phone: phone,
          buyer_company: company,
        },
      }, { onConflict: "visitor_id,session_id" });
    }

    return new Response(JSON.stringify({ ok: true, contact_id: contactId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-domain-step error:", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
