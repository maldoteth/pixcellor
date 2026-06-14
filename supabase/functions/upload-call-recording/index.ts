import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const form = await req.formData();
    const bookingId = String(form.get("booking_id") ?? "");
    const token = String(form.get("token") ?? "");
    const duration = Number(form.get("duration_seconds") ?? 0);
    const file = form.get("file");

    if (!bookingId || !token || !(file instanceof File)) {
      return new Response(JSON.stringify({ ok: false, error: "missing_params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only host token may upload recordings
    const { data: rpc, error: rpcErr } = await supabase.rpc("get_call_room", {
      p_booking: bookingId, p_token: token,
    });
    if (rpcErr || !rpc?.[0] || rpc[0].role !== "host") {
      return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = (file.type.includes("mp4") ? "mp4" : "webm");
    const path = `${bookingId}/${Date.now()}.${ext}`;
    const buf = new Uint8Array(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from("call-recordings")
      .upload(path, buf, { contentType: file.type || "video/webm", upsert: false });
    if (upErr) {
      return new Response(JSON.stringify({ ok: false, error: upErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("call_recordings").insert({
      booking_id: bookingId,
      storage_path: path,
      mime_type: file.type || "video/webm",
      size_bytes: buf.byteLength,
      duration_seconds: Math.round(duration) || null,
    });

    return new Response(JSON.stringify({ ok: true, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
