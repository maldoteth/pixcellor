import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { booking_id, token } = await req.json();
    if (!booking_id || !token) {
      return new Response(JSON.stringify({ ok: false, error: "missing_params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.rpc("get_call_room", {
      p_booking: booking_id,
      p_token: token,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const room = data[0];

    // Build ICE config. Always include Google STUN. Add Metered TURN if configured.
    const iceServers: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];

    const turnUrls = Deno.env.get("METERED_TURN_URLS");
    const turnUser = Deno.env.get("METERED_TURN_USERNAME");
    const turnCred = Deno.env.get("METERED_TURN_CREDENTIAL");

    if (turnUrls && turnUser && turnCred) {
      const urls = turnUrls.split(",").map((u) => u.trim()).filter(Boolean);
      iceServers.push({ urls, username: turnUser, credential: turnCred });
    }

    return new Response(JSON.stringify({
      ok: true,
      room: {
        booking_id: room.booking_id,
        role: room.role,
        display_name: room.display_name,
        scheduled_at: room.scheduled_at,
        status: room.status,
      },
      ice_servers: iceServers,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
