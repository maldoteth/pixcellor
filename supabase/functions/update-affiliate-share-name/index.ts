import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) throw new Error("Server not configured");

    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supaAuth = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: u, error: ue } = await supaAuth.auth.getUser(token);
    if (ue || !u.user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const codeId = typeof body?.code_id === "string" ? body.code_id : "";
    const shareName = typeof body?.share_name === "string" ? body.share_name.trim().slice(0, 40) : "";
    if (!codeId) return new Response(JSON.stringify({ error: "code_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: row } = await admin.from("affiliate_codes").select("id, owner_user_id").eq("id", codeId).maybeSingle();
    if (!row || row.owner_user_id !== u.user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error } = await admin
      .from("affiliate_codes")
      .update({ share_name: shareName || null })
      .eq("id", codeId);
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ ok: true, share_name: shareName || null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
