import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) throw new Error("Missing Google Maps connector credentials");
  const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY },
  });
  if (!res.ok) { console.error("geocode http", res.status, await res.text()); return null; }
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.length) { console.warn("geocode no-result", address, data.status); return null; }
  const loc = data.results[0].geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat, lng: loc.lng };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    // admin check via has_role (existing helper)
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userRes.user.id);
    const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { entity_type, id, address, batch, limit = 50, force = false } = body ?? {};

    // Single mode
    if (id && entity_type && (entity_type === "candidate" || entity_type === "vacancy")) {
      const table = entity_type === "candidate" ? "candidates" : "vacancies";
      let addr = address as string | undefined;
      if (!addr) {
        const { data: row } = await admin.from(table).select("location").eq("id", id).single();
        addr = row?.location ?? undefined;
      }
      if (!addr) return new Response(JSON.stringify({ ok: false, error: "no_address" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const r = await geocode(addr);
      if (!r) return new Response(JSON.stringify({ ok: false, error: "geocode_failed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await admin.from(table).update({ latitude: r.lat, longitude: r.lng, geocoded_at: new Date().toISOString(), geocode_source: "google_maps" }).eq("id", id);
      return new Response(JSON.stringify({ ok: true, lat: r.lat, lng: r.lng }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Batch mode
    if (batch) {
      const cap = Math.min(Math.max(Number(limit) || 50, 1), 200);
      const results: Record<string, { ok: number; failed: number; skipped: number }> = {};
      const targets = entity_type ? [entity_type] : ["candidate", "vacancy"];
      for (const t of targets) {
        const table = t === "candidate" ? "candidates" : "vacancies";
        let q = admin.from(table).select("id,location").not("location", "is", null).neq("location", "").limit(cap);
        if (!force) q = q.is("latitude", null);
        const { data: rows } = await q;
        const r = { ok: 0, failed: 0, skipped: 0 };
        for (const row of (rows ?? []) as any[]) {
          if (!row.location) { r.skipped++; continue; }
          const g = await geocode(row.location);
          if (!g) { r.failed++; continue; }
          await admin.from(table).update({ latitude: g.lat, longitude: g.lng, geocoded_at: new Date().toISOString(), geocode_source: "google_maps" }).eq("id", row.id);
          r.ok++;
          // gentle pace
          await new Promise((res) => setTimeout(res, 60));
        }
        results[t] = r;
      }
      return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
