import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    return new Response(JSON.stringify({ error: "Twilio not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Settings
  const { data: settings } = await admin.from("sms_settings").select("*").eq("id", 1).maybeSingle();
  const ratePerSecond = Math.max(1, Math.min(20, settings?.rate_per_second ?? 5));

  // Quiet hours guard (UK time)
  if (settings?.enforce_quiet_hours) {
    const ukNow = new Date(new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }));
    const hour = ukNow.getHours();
    const start = settings.quiet_hours_start ?? 21;
    const end = settings.quiet_hours_end ?? 8;
    const inQuiet = start > end ? hour >= start || hour < end : hour >= start && hour < end;
    if (inQuiet) {
      return new Response(JSON.stringify({ skipped: "quiet_hours", hour }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Pick a batch of queued messages, batch sized by rate
  const batchSize = ratePerSecond * 10; // ~10 sec window
  const { data: queued, error: qErr } = await admin
    .from("sms_messages")
    .select("id, to_phone, from_phone, body, broadcast_id")
    .eq("direction", "outbound")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!queued || queued.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Mark sending to claim
  const ids = queued.map((m) => m.id);
  await admin.from("sms_messages").update({ status: "sending" }).in("id", ids);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const intervalMs = Math.ceil(1000 / ratePerSecond);

  let sent = 0;
  let failed = 0;
  const touchedBroadcasts = new Set<string>();

  for (const msg of queued) {
    try {
      const params = new URLSearchParams({
        To: msg.to_phone!,
        From: msg.from_phone!,
        Body: msg.body,
      });
      // Add status callback if SUPABASE_URL is public
      const supaUrl = Deno.env.get("SUPABASE_URL");
      if (supaUrl) {
        params.set("StatusCallback", `${supaUrl}/functions/v1/twilio-status-webhook`);
      }

      const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
      const data = await res.json();

      if (!res.ok) {
        failed++;
        await admin
          .from("sms_messages")
          .update({
            status: "failed",
            error_code: String(data?.code ?? res.status),
            error_message: String(data?.message ?? "Twilio error"),
          })
          .eq("id", msg.id);
      } else {
        sent++;
        await admin
          .from("sms_messages")
          .update({
            status: data.status === "delivered" ? "delivered" : "sent",
            twilio_sid: data.sid,
            sent_at: new Date().toISOString(),
            segments: data.num_segments ? Number(data.num_segments) : null,
            price: data.price ? Number(data.price) : null,
            price_unit: data.price_unit ?? null,
          })
          .eq("id", msg.id);
      }
      if (msg.broadcast_id) touchedBroadcasts.add(msg.broadcast_id);
    } catch (e) {
      failed++;
      await admin
        .from("sms_messages")
        .update({
          status: "failed",
          error_message: e instanceof Error ? e.message : "Unknown",
        })
        .eq("id", msg.id);
    }
    await sleep(intervalMs);
  }

  // Update broadcast counters
  for (const bid of touchedBroadcasts) {
    const { data: agg } = await admin
      .from("sms_messages")
      .select("status", { count: "exact", head: false })
      .eq("broadcast_id", bid);
    if (agg) {
      const counts = agg.reduce(
        (acc: Record<string, number>, r: { status: string }) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1;
          return acc;
        },
        {}
      );
      const sentTotal = (counts.sent ?? 0) + (counts.delivered ?? 0);
      const failedTotal = (counts.failed ?? 0) + (counts.undelivered ?? 0);
      const queuedRemaining = (counts.queued ?? 0) + (counts.sending ?? 0);
      await admin
        .from("sms_broadcasts")
        .update({
          sent_count: sentTotal,
          delivered_count: counts.delivered ?? 0,
          failed_count: failedTotal,
          status: queuedRemaining > 0 ? "sending" : failedTotal === agg.length ? "failed" : "sent",
          started_at: queuedRemaining < agg.length ? new Date().toISOString() : null,
          completed_at: queuedRemaining === 0 ? new Date().toISOString() : null,
        })
        .eq("id", bid);
    }
  }

  return new Response(JSON.stringify({ processed: queued.length, sent, failed }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
