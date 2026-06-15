import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: hostMatch } = await supabase
      .from("call_bookings")
      .select("id, host_token")
      .eq("host_code", code)
      .maybeSingle();
    if (hostMatch) {
      return new Response(JSON.stringify({
        ok: true, booking_id: hostMatch.id, token: hostMatch.host_token, role: "host",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: guestMatch } = await supabase
      .from("call_bookings")
      .select("id, guest_token")
      .eq("guest_code", code)
      .maybeSingle();
    if (guestMatch) {
      return new Response(JSON.stringify({
        ok: true, booking_id: guestMatch.id, token: guestMatch.guest_token, role: "guest",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("resolve-meeting-code error", e);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
