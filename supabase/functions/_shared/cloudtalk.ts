// Shared helpers for the CloudTalk telephony sync.
//
// CloudTalk delivers events through Workflow Automations: a trigger (call
// ended, recording uploaded, transcription created) fires an "API Request"
// action, and the JSON body of that request is hand-built in the CloudTalk UI
// from {{event.properties.*}} templates. That means the payload shape is
// configuration, not contract — so everything here reads defensively and
// accepts the aliases CloudTalk uses across its trigger types.
//
// The "Useful data for your Workflow" panel on the Call > Ended trigger lists:
//   call_uuid, call_id, internal_number, external_number, direction ("outgoing"),
//   started_at (ISO 8601 Z), waiting_time, talking_time, wrapup_time,
//   recording_url, note, tags, contacts, agent, dialer_data
// Note there is no ended_at, answered_at or status on that trigger — those
// columns stay null unless a later trigger supplies them.
//
// See docs/cloudtalk-setup.md for the request bodies these expect.

export type CloudTalkEventKind = "call" | "recording" | "transcript" | "unknown";

export interface NormalizedCall {
  providerCallId: string;
  eventKind: CloudTalkEventKind;
  direction: string;
  status: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  externalNumber: string | null;
  agentName: string | null;
  agentEmail: string | null;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  talkTimeSeconds: number | null;
  waitingTimeSeconds: number | null;
  recordingUrl: string | null;
  transcript: string | null;
  contactName: string | null;
  contactEmail: string | null;
}

const isBlank = (v: unknown): boolean =>
  v === null ||
  v === undefined ||
  (typeof v === "string" && (v.trim() === "" || v.trim().startsWith("{{")));

/** First non-blank value among `keys`, searched case-insensitively. */
function pick(source: Record<string, unknown>, keys: string[]): unknown {
  const lowered = new Map<string, unknown>();
  for (const [k, v] of Object.entries(source)) lowered.set(k.toLowerCase(), v);
  for (const key of keys) {
    const v = lowered.get(key.toLowerCase());
    if (!isBlank(v)) return v;
  }
  return undefined;
}

const str = (v: unknown): string | null => {
  if (isBlank(v)) return null;
  return String(v).trim();
};

/**
 * Flatten one level of the wrappers CloudTalk puts around event data, so
 * `{ data: { call_id } }` and `{ event: { properties: { call_id } } }` both
 * read the same as a flat body. Top-level keys win.
 */
function flatten(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const nests = [
    raw.event && typeof raw.event === "object"
      ? (raw.event as Record<string, unknown>).properties
      : undefined,
    raw.properties,
    raw.data,
    raw.call,
    raw.payload,
  ];
  for (const nest of nests) {
    if (nest && typeof nest === "object" && !Array.isArray(nest)) {
      Object.assign(out, nest as Record<string, unknown>);
    }
  }
  Object.assign(out, raw);
  return out;
}

/**
 * Last 9 digits, matching public.normalize_phone in the database. Stable
 * across +44 / 0044 / 0 prefixes for the ranges we handle.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/[^0-9]/g, "");
  if (digits.length < 6) return null;
  return digits.slice(-9);
}

/**
 * CloudTalk sends "2026-08-03 14:22:11" with no zone, ISO strings, and unix
 * seconds depending on the field. Naive datetimes are read as UTC — CloudTalk
 * account timestamps are UTC unless the account overrides it.
 */
export function toIso(value: unknown): string | null {
  if (isBlank(value)) return null;

  if (typeof value === "number" || /^\d{9,13}$/.test(String(value).trim())) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const ms = n > 1e11 ? n : n * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  let s = String(value).trim().replace(" ", "T");
  if (!/([Zz]|[+-]\d{2}:?\d{2})$/.test(s)) s += "Z";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toSeconds(value: unknown): number | null {
  if (isBlank(value)) return null;
  // "00:04:12" style durations
  const s = String(value).trim();
  const hms = s.match(/^(\d+):([0-5]\d):([0-5]\d)$/);
  if (hms) return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function detectEventKind(flat: Record<string, unknown>, transcript: string | null, recordingUrl: string | null): CloudTalkEventKind {
  const declared = (str(pick(flat, ["event", "event_type", "eventName", "type", "trigger"])) ?? "").toLowerCase();
  if (declared.includes("transcri")) return "transcript";
  if (declared.includes("record")) return "recording";
  if (declared.includes("call")) return "call";
  // Nothing declared — infer from what actually arrived.
  if (transcript) return "transcript";
  if (recordingUrl) return "recording";
  return "unknown";
}

function detectDirection(flat: Record<string, unknown>): string {
  const raw = (str(pick(flat, ["direction", "call_direction", "type", "callType"])) ?? "").toLowerCase();
  if (raw.includes("out")) return "outbound";
  if (raw.includes("in")) return "inbound";
  return "unknown";
}

export function normalizeCallPayload(raw: Record<string, unknown>): NormalizedCall | null {
  const flat = flatten(raw);

  const providerCallId = str(
    pick(flat, ["call_id", "callId", "cdr_id", "cdrId", "call_uuid", "uuid", "id"]),
  );
  if (!providerCallId) return null;

  const direction = detectDirection(flat);
  const fromNumber = str(pick(flat, ["from", "from_number", "fromNumber", "caller_number", "caller", "public_number"]));
  const toNumber = str(pick(flat, ["to", "to_number", "toNumber", "called_number", "callee", "internal_number"]));

  // The customer's leg: opposite the agent depending on direction. Fall back to
  // an explicit contact number when CloudTalk supplies one.
  const explicitExternal = str(pick(flat, ["contact_number", "contactNumber", "external_number", "client_number"]));
  const externalNumber = explicitExternal ??
    (direction === "outbound" ? toNumber : direction === "inbound" ? fromNumber : (fromNumber ?? toNumber));

  const transcript = str(pick(flat, ["transcript", "transcription", "transcription_text", "text", "speech_to_text"]));
  const recordingUrl = str(pick(flat, ["recording_url", "recordingUrl", "recording", "record_url", "audio_url"]));

  return {
    providerCallId,
    eventKind: detectEventKind(flat, transcript, recordingUrl),
    direction,
    status: str(pick(flat, ["status", "call_status", "disposition", "result"])),
    fromNumber,
    toNumber,
    externalNumber,
    agentName: str(pick(flat, ["agent_name", "agentName", "agent", "user_name", "operator"])),
    agentEmail: str(pick(flat, ["agent_email", "agentEmail", "user_email"])),
    startedAt: toIso(pick(flat, ["started_at", "startedAt", "start_time", "started", "call_started"])),
    answeredAt: toIso(pick(flat, ["answered_at", "answeredAt", "answered", "answer_time"])),
    endedAt: toIso(pick(flat, ["ended_at", "endedAt", "end_time", "ended", "call_ended"])),
    talkTimeSeconds: toSeconds(pick(flat, ["talk_time", "talking_time", "talkingTime", "duration", "billsec"])),
    waitingTimeSeconds: toSeconds(pick(flat, ["waiting_time", "waitingTime", "wait_time", "ringing_time"])),
    recordingUrl,
    transcript,
    contactName: str(pick(flat, ["contact_name", "contactName", "client_name", "name"])),
    contactEmail: str(pick(flat, ["contact_email", "contactEmail", "client_email", "email"])),
  };
}

/** Constant-time string compare for shared secrets. */
export function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/**
 * Basic auth header for the CloudTalk public API. CloudTalk issues an Access
 * Key ID and a separate Access Key Secret; both are required.
 */
export function cloudtalkAuthHeader(): string | null {
  // Deno.env.get is case-sensitive. Uppercase matches the convention used by
  // every other secret in this project; the lowercase pair is what is actually
  // set on the Supabase project today, so accept either.
  const id = Deno.env.get("CLOUDTALK_API_KEY_ID") ?? Deno.env.get("cloudtalk_id");
  const secret = Deno.env.get("CLOUDTALK_API_KEY_SECRET") ?? Deno.env.get("cloudtalk_secret");
  if (!id || !secret) return null;
  return `Basic ${btoa(`${id}:${secret}`)}`;
}
