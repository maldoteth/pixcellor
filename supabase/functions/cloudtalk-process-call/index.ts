// Turns a call transcript into CRM notes and a scheduled callback.
//
// Two modes:
//   { call_id: "<uuid>" }        process one call (how cloudtalk-webhook calls it)
//   { sweep: true, limit: 25 }   process everything still waiting — the retry
//                                backstop when the webhook's inline call fails
//
// Internal only: authorised with the service role key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { cloudtalkAuthHeader } from "../_shared/cloudtalk.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BUSINESS_TZ = "Europe/London";
const MAX_TRANSCRIPT_CHARS = 24_000;
const RECORDING_BUCKET = "cloudtalk-recordings";
// Edge functions buffer the download in memory; an hour of call audio is a few
// MB, so anything past this is a sign something is wrong.
const MAX_RECORDING_BYTES = 50 * 1024 * 1024;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface CallRow {
  id: string;
  contact_id: string | null;
  direction: string;
  status: string | null;
  agent_name: string | null;
  external_number: string | null;
  started_at: string | null;
  talk_time_seconds: number | null;
  transcript: string | null;
  recording_url: string | null;
  recording_storage_path: string | null;
  note_event_id: string | null;
  callback_event_id: string | null;
}

interface CallAnalysis {
  summary: string;
  notes: string[];
  outcome: string;
  sentiment: string;
  callback_promised: boolean;
  callback_at: string | null;
  callback_reason: string | null;
}

function parseJsonLoose(content: string): unknown {
  const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Model occasionally wraps the object in prose — take the outermost braces.
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last <= first) return null;
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}

/**
 * Only trust a callback time that is genuinely in the future and inside a
 * sensible horizon — a hallucinated date shouldn't create a task nobody sees.
 */
function validCallbackAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const now = Date.now();
  if (d.getTime() <= now) return null;
  if (d.getTime() > now + 365 * 24 * 60 * 60 * 1000) return null;
  return d.toISOString();
}

async function analyse(call: CallRow, apiKey: string): Promise<CallAnalysis | null> {
  const reference = call.started_at ?? new Date().toISOString();
  const transcript = (call.transcript ?? "").slice(0, MAX_TRANSCRIPT_CHARS);

  const prompt = [
    "You are a CRM assistant for Pixcellor. Read this phone call transcript and write the record the sales team will read later.",
    "",
    `Call reference time (UTC): ${reference}`,
    `Business timezone: ${BUSINESS_TZ}`,
    `Direction: ${call.direction}. Agent: ${call.agent_name ?? "unknown"}.`,
    "",
    "TRANSCRIPT:",
    transcript,
    "",
    "Return ONLY a JSON object with these keys:",
    '  "summary": one or two sentences on what the call was about and what was agreed.',
    '  "notes": array of short factual bullet strings (max 6). Facts stated on the call only.',
    '  "outcome": one of "sale", "qualified", "follow_up", "not_interested", "no_answer", "wrong_number", "support", "other".',
    '  "sentiment": one of "positive", "neutral", "negative".',
    '  "callback_promised": true only if a further contact was actually agreed or requested on the call.',
    '  "callback_at": absolute UTC ISO 8601 timestamp for that callback, or null if no time was agreed.',
    '  "callback_reason": short reason for the callback, or null.',
    "",
    `Resolve relative times ("Tuesday afternoon", "next week") against the call reference time in ${BUSINESS_TZ}, then output UTC.`,
    "If no specific time was agreed but a callback was requested, set callback_promised true and callback_at null.",
    "Do not invent facts, times or commitments that are not in the transcript.",
  ].join("\n");

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`ai_gateway_${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }

  const body = await res.json();
  const parsed = parseJsonLoose(body.choices?.[0]?.message?.content ?? "");
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;

  return {
    summary: typeof p.summary === "string" ? p.summary.trim() : "",
    notes: Array.isArray(p.notes) ? p.notes.filter((n): n is string => typeof n === "string").slice(0, 6) : [],
    outcome: typeof p.outcome === "string" ? p.outcome.trim() : "other",
    sentiment: typeof p.sentiment === "string" ? p.sentiment.trim() : "neutral",
    callback_promised: p.callback_promised === true,
    callback_at: validCallbackAt(p.callback_at),
    callback_reason: typeof p.callback_reason === "string" ? p.callback_reason.trim() : null,
  };
}

function buildNoteBody(call: CallRow, a: CallAnalysis): string {
  const lines: string[] = [];
  if (a.summary) lines.push(a.summary);
  if (a.notes.length) {
    lines.push("");
    for (const n of a.notes) lines.push(`• ${n}`);
  }
  const meta: string[] = [];
  if (a.outcome) meta.push(`Outcome: ${a.outcome}`);
  if (a.sentiment) meta.push(`Sentiment: ${a.sentiment}`);
  if (call.talk_time_seconds !== null) {
    const m = Math.floor(call.talk_time_seconds / 60);
    const s = call.talk_time_seconds % 60;
    meta.push(`Talk time: ${m}m ${s}s`);
  }
  if (call.agent_name) meta.push(`Agent: ${call.agent_name}`);
  if (meta.length) {
    lines.push("");
    lines.push(meta.join(" · "));
  }
  return lines.join("\n").trim();
}

// deno-lint-ignore no-explicit-any
type Db = any;

/**
 * CloudTalk's recording_url needs CloudTalk credentials to open, which nobody
 * in the CRM has. Pull the audio once with the API key pair and keep our own
 * copy in a private bucket so the record is self-contained.
 *
 * Best-effort: a failure here must not stop the notes being written.
 */
async function mirrorRecording(supabase: Db, call: CallRow): Promise<Record<string, unknown>> {
  if (!call.recording_url || call.recording_storage_path) return {};

  const auth = cloudtalkAuthHeader();
  if (!auth) {
    console.warn("CLOUDTALK_API_KEY_ID/SECRET not set — leaving recording as a CloudTalk link");
    return {};
  }

  try {
    const res = await fetch(call.recording_url, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.warn("recording fetch failed", call.id, res.status);
      return {};
    }

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_RECORDING_BYTES) {
      console.warn("recording too large, skipping", call.id, declared);
      return {};
    }

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_RECORDING_BYTES) {
      console.warn("recording size out of range", call.id, buf.byteLength);
      return {};
    }

    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "audio/mpeg";
    const ext = contentType.includes("wav") ? "wav" : contentType.includes("ogg") ? "ogg" : "mp3";
    const path = `${call.id}.${ext}`;

    const { error } = await supabase.storage
      .from(RECORDING_BUCKET)
      .upload(path, buf, { contentType, upsert: true });
    if (error) {
      console.warn("recording upload failed", call.id, error.message);
      return {};
    }

    return {
      recording_storage_path: path,
      recording_mime_type: contentType,
      recording_size_bytes: buf.byteLength,
    };
  } catch (e) {
    console.warn("recording mirror error", call.id, (e as Error).message);
    return {};
  }
}

async function processCall(supabase: Db, call: CallRow, apiKey: string) {
  const recordingPatch = await mirrorRecording(supabase, call);

  if (!call.transcript?.trim()) {
    if (Object.keys(recordingPatch).length) {
      await supabase.from("phone_calls").update(recordingPatch).eq("id", call.id);
    }
    return {
      id: call.id,
      status: "skipped",
      reason: "no_transcript",
      recording_saved: Boolean(recordingPatch.recording_storage_path),
    };
  }

  let analysis: CallAnalysis | null;
  try {
    analysis = await analyse(call, apiKey);
  } catch (e) {
    const msg = (e as Error).message.slice(0, 500);
    console.error("analyse failed", call.id, msg);
    // Leave ai_processed_at null so the sweep retries this one.
    await supabase.from("phone_calls").update({ ai_error: msg }).eq("id", call.id);
    return { id: call.id, status: "failed", reason: msg };
  }

  if (!analysis) {
    await supabase.from("phone_calls").update({ ai_error: "unparseable_ai_response" }).eq("id", call.id);
    return { id: call.id, status: "failed", reason: "unparseable_ai_response" };
  }

  const patch: Record<string, unknown> = {
    ...recordingPatch,
    ai_summary: analysis.summary || null,
    ai_notes: analysis.notes.length ? analysis.notes.join("\n") : null,
    ai_outcome: analysis.outcome || null,
    ai_sentiment: analysis.sentiment || null,
    ai_processed_at: new Date().toISOString(),
    ai_error: null,
  };

  // Timeline rows need a contact. Without one there's nowhere to hang them,
  // so keep the analysis on the call and move on.
  if (call.contact_id) {
    const when = call.started_at
      ? new Date(call.started_at).toLocaleString("en-GB", { timeZone: BUSINESS_TZ })
      : "unknown time";
    const title = `${call.direction === "outbound" ? "Outbound" : "Inbound"} call — ${when}`;
    const description = buildNoteBody(call, analysis);

    if (call.note_event_id) {
      await supabase.from("contact_events")
        .update({ title, description, event_type: "call" })
        .eq("id", call.note_event_id);
    } else {
      const { data: note, error } = await supabase.from("contact_events")
        .insert({ contact_id: call.contact_id, title, description, event_type: "call" })
        .select("id").single();
      if (error) console.error("note insert failed", call.id, error.message);
      if (note?.id) patch.note_event_id = note.id;
    }

    if (analysis.callback_promised) {
      const cbTitle = analysis.callback_reason
        ? `Callback: ${analysis.callback_reason}`
        : "Callback requested on call";
      const cbBody = analysis.callback_at
        ? null
        : "No specific time agreed on the call — schedule manually.";

      if (call.callback_event_id) {
        await supabase.from("contact_events")
          .update({ title: cbTitle, description: cbBody, callback_at: analysis.callback_at })
          .eq("id", call.callback_event_id);
      } else {
        const { data: cb, error } = await supabase.from("contact_events")
          .insert({
            contact_id: call.contact_id,
            title: cbTitle,
            description: cbBody,
            event_type: "callback",
            callback_at: analysis.callback_at,
          })
          .select("id").single();
        if (error) console.error("callback insert failed", call.id, error.message);
        if (cb?.id) patch.callback_event_id = cb.id;
      }
    }
  }

  const { error: updErr } = await supabase.from("phone_calls").update(patch).eq("id", call.id);
  if (updErr) console.error("phone_calls update failed", call.id, updErr.message);

  return {
    id: call.id,
    status: "processed",
    outcome: analysis.outcome,
    callback_at: analysis.callback_at,
  };
}

const SELECT = "id, contact_id, direction, status, agent_name, external_number, started_at, talk_time_seconds, transcript, recording_url, recording_storage_path, note_event_id, callback_event_id";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Platform JWT verification (verify_jwt = true for this function) has
  // already validated the bearer's signature before this code runs. The
  // runtime's own service key and the vault copy the pg_cron sweep sends are
  // different string representations of the same authority, so a string
  // compare against SERVICE_KEY wrongly rejects the cron. Require the
  // platform-verified token's role claim instead — anon tokens pass the
  // gateway too, and this is what keeps them out.
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  let role = "";
  try {
    const seg = bearer.split(".")[1] ?? "";
    const pad = seg.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - seg.length % 4) % 4);
    role = JSON.parse(atob(pad))?.role ?? "";
  } catch {
    role = "";
  }
  if (role !== "service_role") {
    console.warn("cloudtalk-process-call: rejected caller with role", role || "(none)");
    return json(401, { ok: false, error: "unauthorized" });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json(500, { ok: false, error: "lovable_api_key_not_configured" });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // Allow an empty body for cron-triggered sweeps.
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  if (body.call_id) {
    const { data: call, error } = await supabase
      .from("phone_calls").select(SELECT).eq("id", body.call_id).maybeSingle();
    if (error) return json(500, { ok: false, error: error.message });
    if (!call) return json(404, { ok: false, error: "call_not_found" });
    return json(200, { ok: true, result: await processCall(supabase, call as CallRow, apiKey) });
  }

  const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 100);

  // Calls whose notes never got written.
  const { data: needNotes, error: notesErr } = await supabase
    .from("phone_calls")
    .select(SELECT)
    .is("ai_processed_at", null)
    .not("transcript", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (notesErr) return json(500, { ok: false, error: notesErr.message });

  // Calls whose audio never got mirrored. Bounded to the last 24h: if Speech-to-Text
  // is off, or a recording 404s, these never resolve and would otherwise be retried
  // on every sweep forever.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: needAudio, error: audioErr } = await supabase
    .from("phone_calls")
    .select(SELECT)
    .not("recording_url", "is", null)
    .is("recording_storage_path", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (audioErr) return json(500, { ok: false, error: audioErr.message });

  const byId = new Map<string, CallRow>();
  for (const c of [...((needNotes ?? []) as CallRow[]), ...((needAudio ?? []) as CallRow[])]) {
    byId.set(c.id, c);
  }

  const results = [];
  for (const call of [...byId.values()].slice(0, limit)) {
    results.push(await processCall(supabase, call, apiKey));
  }

  return json(200, { ok: true, swept: results.length, results });
});
