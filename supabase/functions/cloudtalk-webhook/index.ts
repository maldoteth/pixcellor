// Ingests CloudTalk Workflow Automation events into the CRM.
//
// CloudTalk fires this up to three times per call — once when the call ends,
// again when the recording is uploaded, again when Speech-to-Text finishes.
// All three carry the same call_id and upsert onto the same phone_calls row,
// so the handler is idempotent and never clobbers a field it wasn't given.
//
// Auth: static `Authorization: Bearer <CLOUDTALK_WEBHOOK_SECRET>` header,
// configured on the CloudTalk API Request action.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { normalizeCallPayload, safeEq } from "../_shared/cloudtalk.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// This endpoint is public and writes to contacts/contact_events, and the URL is
// discoverable — Supabase project refs ship in the frontend bundle. A short
// secret is brute-forceable in minutes, so refuse to run behind one rather than
// accept writes we can't attribute.
const MIN_WEBHOOK_SECRET_LENGTH = 16;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Drop null/undefined so a later event can't blank a field an earlier one set. */
function definedOnly(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  const secret = Deno.env.get("CLOUDTALK_WEBHOOK_SECRET");
  if (!secret) {
    console.error("CLOUDTALK_WEBHOOK_SECRET not configured — refusing webhook");
    return json(500, { ok: false, error: "webhook_secret_not_configured" });
  }
  if (secret.length < MIN_WEBHOOK_SECRET_LENGTH) {
    console.error(
      `CLOUDTALK_WEBHOOK_SECRET is ${secret.length} chars — refusing webhook. ` +
        `Needs at least ${MIN_WEBHOOK_SECRET_LENGTH}.`,
    );
    return json(500, { ok: false, error: "webhook_secret_too_weak" });
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ") || !safeEq(auth.slice(7).trim(), secret)) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return json(400, { ok: false, error: "invalid_body" });
  }

  const call = normalizeCallPayload(raw as Record<string, unknown>);
  if (!call) {
    console.warn("cloudtalk-webhook: no call id in payload", JSON.stringify(raw).slice(0, 500));
    return json(400, { ok: false, error: "call_id_required" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: existing } = await supabase
    .from("phone_calls")
    .select("id, contact_id, transcript, ai_processed_at, raw_payload")
    .eq("provider", "cloudtalk")
    .eq("provider_call_id", call.providerCallId)
    .maybeSingle();

  // Resolve the contact once and keep it pinned across later events.
  let contactId: string | null = existing?.contact_id ?? null;
  if (!contactId && call.externalNumber) {
    const { data: matched, error: matchErr } = await supabase
      .rpc("find_contact_by_phone", { _phone: call.externalNumber });
    if (matchErr) console.warn("contact match failed", matchErr.message);
    contactId = (matched as string | null) ?? null;

    // Unknown number: create the contact so the call has somewhere to live.
    if (!contactId) {
      const { data: created, error: createErr } = await supabase
        .from("contacts")
        .insert({
          name: call.contactName || call.externalNumber,
          contact_name: call.contactName || null,
          phone: call.externalNumber,
          email: call.contactEmail ? call.contactEmail.toLowerCase() : null,
          industry: "general",
          source: "cloudtalk",
          status: "new",
        })
        .select("id")
        .single();
      if (createErr) console.error("contact create failed", createErr.message);
      contactId = created?.id ?? null;
    }
  }

  const row = definedOnly({
    provider: "cloudtalk",
    provider_call_id: call.providerCallId,
    contact_id: contactId,
    direction: call.direction === "unknown" ? undefined : call.direction,
    status: call.status,
    from_number: call.fromNumber,
    to_number: call.toNumber,
    external_number: call.externalNumber,
    agent_name: call.agentName,
    agent_email: call.agentEmail,
    started_at: call.startedAt,
    answered_at: call.answeredAt,
    ended_at: call.endedAt,
    talk_time_seconds: call.talkTimeSeconds,
    waiting_time_seconds: call.waitingTimeSeconds,
    recording_url: call.recordingUrl,
    transcript: call.transcript,
    // Keyed by event so the call, recording and transcript bodies all survive —
    // this is what you read to find the field names CloudTalk actually sent.
    raw_payload: {
      ...(existing?.raw_payload && typeof existing.raw_payload === "object" && !Array.isArray(existing.raw_payload)
        ? existing.raw_payload
        : {}),
      [call.eventKind]: raw,
    },
  });

  const { data: saved, error: saveErr } = await supabase
    .from("phone_calls")
    .upsert(row, { onConflict: "provider,provider_call_id" })
    .select("id, transcript, ai_processed_at, recording_url, recording_storage_path")
    .single();

  if (saveErr || !saved) {
    console.error("phone_calls upsert failed", saveErr?.message);
    return json(500, { ok: false, error: "save_failed", detail: saveErr?.message ?? "no_row_returned" });
  }

  // Notes and callbacks need the transcript, which arrives on the last event.
  // Kick off processing but never fail the webhook on it — CloudTalk retries
  // non-2xx responses, and the sweep in cloudtalk-process-call is the backstop.
  let processing: "queued" | "skipped" | "failed" = "skipped";
  const needsNotes = Boolean(saved.transcript) && !saved.ai_processed_at;
  const needsRecording = Boolean(saved.recording_url) && !saved.recording_storage_path;
  if (needsNotes || needsRecording) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/cloudtalk-process-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ call_id: saved.id }),
        signal: AbortSignal.timeout(20_000),
      });
      processing = resp.ok ? "queued" : "failed";
      if (!resp.ok) {
        console.warn("process-call failed", resp.status, await resp.text().catch(() => ""));
      }
    } catch (e) {
      processing = "failed";
      console.warn("process-call error", (e as Error).message);
    }
  }

  return json(200, {
    ok: true,
    call_id: saved.id,
    contact_id: contactId,
    event: call.eventKind,
    processing,
  });
});
