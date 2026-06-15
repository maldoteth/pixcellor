import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Validates Twilio webhook signature
async function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return b64 === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const form = await req.formData();
    const params: Record<string, string> = {};
    form.forEach((v, k) => { params[k] = String(v); });

    const signature = req.headers.get("X-Twilio-Signature") ?? "";
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const url = req.url; // include query string

    // Fail closed: reject unsigned requests or when the auth token isn't configured.
    if (!authToken) {
      console.error("TWILIO_AUTH_TOKEN not configured — refusing inbound webhook");
      return new Response("forbidden", { status: 403 });
    }
    if (!signature) {
      console.warn("Missing X-Twilio-Signature header");
      return new Response("forbidden", { status: 403 });
    }
    const sigOk = await validateTwilioSignature(url, params, signature, authToken);
    if (!sigOk) {
      console.warn("Invalid Twilio signature");
      return new Response("forbidden", { status: 403 });
    }

    const from = params.From;
    const to = params.To;
    const body = (params.Body || "").trim();
    const messageSid = params.MessageSid || params.SmsMessageSid;

    if (!from || !body) {
      return new Response("<Response/>", { headers: { "Content-Type": "text/xml" }, status: 200 });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const upper = body.trim().toUpperCase();
    const isStop = ["STOP", "STOPALL", "UNSUBSCRIBE", "UNSUB", "CANCEL", "END", "QUIT"].includes(upper);
    const isStart = ["START", "UNSTOP", "YES"].includes(upper);

    // Match contact by phone
    const { data: contact } = await admin
      .from("contacts")
      .select("id")
      .eq("phone", from)
      .maybeSingle();

    // Record inbound message
    const { data: inboundMsg } = await admin
      .from("sms_messages")
      .insert({
        direction: "inbound",
        from_phone: from,
        to_phone: to,
        body,
        status: "received",
        twilio_sid: messageSid,
        contact_id: contact?.id ?? null,
      })
      .select()
      .single();

    if (isStop) {
      await admin
        .from("sms_opt_outs")
        .upsert({ phone: from, reason: "STOP", source: "sms_reply", contact_id: contact?.id ?? null }, { onConflict: "phone" });

      // Confirmation TwiML (Twilio sends it back)
      const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You're unsubscribed and will not receive further marketing SMS from Pixcellor. Reply START to opt back in.</Message></Response>`;
      return new Response(xml, { headers: { "Content-Type": "text/xml" }, status: 200 });
    }

    if (isStart) {
      await admin.from("sms_opt_outs").delete().eq("phone", from);
      const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You're opted back in to Pixcellor SMS.</Message></Response>`;
      return new Response(xml, { headers: { "Content-Type": "text/xml" }, status: 200 });
    }

    // Otherwise store as reply for inbox
    await admin.from("sms_inbound_replies").insert({
      message_id: inboundMsg?.id ?? null,
      contact_id: contact?.id ?? null,
      from_phone: from,
      to_phone: to,
      body,
    });

    if (contact?.id) {
      await admin.from("contact_events").insert({
        contact_id: contact.id,
        event_type: "sms_reply",
        title: "SMS reply received",
        description: body.slice(0, 1900),
      });

      // Increment broadcast reply count if this reply matches a recent outbound message
      const { data: lastOutbound } = await admin
        .from("sms_messages")
        .select("broadcast_id")
        .eq("to_phone", from)
        .eq("direction", "outbound")
        .not("broadcast_id", "is", null)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastOutbound?.broadcast_id) {
        await admin.rpc("increment_broadcast_replies" as never, { _broadcast_id: lastOutbound.broadcast_id }).catch(async () => {
          // Fallback: manual increment
          const { data: b } = await admin.from("sms_broadcasts").select("reply_count").eq("id", lastOutbound.broadcast_id).maybeSingle();
          await admin.from("sms_broadcasts").update({ reply_count: (b?.reply_count ?? 0) + 1 }).eq("id", lastOutbound.broadcast_id);
        });
      }
    }

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response/>`, {
      headers: { "Content-Type": "text/xml" },
      status: 200,
    });
  } catch (e) {
    console.error("twilio-inbound-webhook error", e);
    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" }, status: 200 });
  }
});
