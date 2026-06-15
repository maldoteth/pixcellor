import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

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
    // Fail closed: reject unsigned requests or when the auth token isn't configured.
    if (!authToken) {
      console.error("TWILIO_AUTH_TOKEN not configured — refusing status webhook");
      return new Response("forbidden", { status: 403 });
    }
    if (!signature) {
      return new Response("forbidden", { status: 403 });
    }
    const sigOk = await validateTwilioSignature(req.url, params, signature, authToken);
    if (!sigOk) return new Response("forbidden", { status: 403 });

    const sid = params.MessageSid || params.SmsSid;
    const status = params.MessageStatus || params.SmsStatus;
    const errorCode = params.ErrorCode;
    if (!sid || !status) return new Response("ok", { status: 200 });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const patch: Record<string, unknown> = { status };
    if (status === "delivered") patch.delivered_at = new Date().toISOString();
    if (errorCode) patch.error_code = errorCode;

    await admin.from("sms_messages").update(patch).eq("twilio_sid", sid);

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("twilio-status-webhook error", e);
    return new Response("ok", { status: 200 });
  }
});
