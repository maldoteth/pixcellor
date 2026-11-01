# CloudTalk → CRM call sync

Every call CloudTalk handles is recorded against a contact, gets an automatic
note written from the transcript, and schedules a callback when one was agreed
on the call.

```
CloudTalk call ends
  └─ Workflow: "Call ended"          ──▶ cloudtalk-webhook ──▶ phone_calls row + contact matched
CloudTalk uploads the recording
  └─ Workflow: "Recording uploaded"  ──▶ cloudtalk-webhook ──▶ recording_url stored
     └─ Speech-to-Text action
        └─ Workflow: "Transcription" ──▶ cloudtalk-webhook ──▶ transcript stored
                                          └─ cloudtalk-process-call
                                               ├─ audio mirrored into private storage
                                               ├─ contact_events  (event_type 'call')     the note
                                               └─ contact_events  (event_type 'callback') callback_at set
```

All three workflows post to the same endpoint with the same `call_id`, so they
upsert onto one `phone_calls` row. Re-delivery is safe — nothing duplicates and
no event blanks a field an earlier one set.

## 1. Secrets

Set these in Supabase → Project Settings → Edge Functions → Secrets.

| Secret | Where it comes from |
| --- | --- |
| `CLOUDTALK_WEBHOOK_SECRET` | Invent a long random string. Also goes in the CloudTalk header below. |
| `CLOUDTALK_API_KEY_ID` | CloudTalk → Account → Settings → API keys → Key ID |
| `CLOUDTALK_API_KEY_SECRET` | Same screen → Key Secret (shown once at creation) |
| `LOVABLE_API_KEY` | Already set (AI gateway key) — used for the note generation |

The key pair is also read from `cloudtalk_id` / `cloudtalk_secret`, which is
what the project has set today. `Deno.env.get` is case-sensitive, so if you
rename them, use the uppercase names above and nothing else will need changing.

CloudTalk's public API uses HTTP Basic auth with the **key ID and secret as a
pair**. A key ID on its own will not authenticate. The key is account-scoped
with full read/write, so treat it like a root credential.

The pair is used to download call audio. CloudTalk's `recording_url` requires
CloudTalk credentials to open, which nobody working in the CRM has — so the
audio is pulled once and mirrored into a private Supabase bucket. Without the
pair everything else still works; `phone_calls.recording_url` is stored but
`recording_storage_path` stays empty and playback from the CRM won't work.

Generate the webhook secret with:

```bash
openssl rand -hex 32
```

`cloudtalk-webhook` is a public endpoint that writes to `contacts` and
`contact_events`, and its URL is discoverable — Supabase project refs ship in
the frontend bundle. The function therefore **refuses to run if
`CLOUDTALK_WEBHOOK_SECRET` is shorter than 16 characters** and returns
`webhook_secret_too_weak`. A short secret is brute-forceable in minutes, and a
successful guess writes fake contacts and callbacks that are indistinguishable
from real ones.

## 2. CloudTalk workflows

In the CloudTalk dashboard: **Account → Workflow Automations → + Add Workflow**.
Requires an Admin-level CloudTalk user.

A workflow is Trigger → (optional Condition) → Action. Create three, each ending
in an **API Request** action pointed at:

```
POST https://rkgjkvghejcmostuqkgw.supabase.co/functions/v1/cloudtalk-webhook
```

In the **Headers** section, `Authorization` is the Key. The word `Bearer` goes at
the front of the Value — putting it in the Key sends a header called `Bearer`,
which the handler ignores, and every event 401s.

| Key | Value |
| --- | --- |
| `Authorization` | `Bearer <CLOUDTALK_WEBHOOK_SECRET>` |

The trigger picker is grouped by object. The ones used here are **Call → Ended**,
**Recording → Uploaded** and **Transcription**. (Call also offers Started,
Ringing on Agent, Answered, Modified and Raised Hand — none of which are wanted:
Ended is the one that fires after wrap-up time completes.)

The request body is built in the **Values** section (`+ Add value`) as key/value
rows. There is no raw JSON box, so add one row per field. The right-hand "Useful
data for your Workflow" panel lists the properties the selected trigger exposes —
insert them from there rather than typing the template syntax by hand.

Key names below are what the handler reads; they do not have to match CloudTalk's
property names, though keeping them the same is easiest to follow.

### Workflow A — "Call ended → CRM"

Trigger: **Call → Ended**.

| Key | Value |
| --- | --- |
| `event` | `call.ended` (literal text, not a variable) |
| `call_id` | `call_id` |
| `call_uuid` | `call_uuid` |
| `direction` | `direction` |
| `external_number` | `external_number` |
| `internal_number` | `internal_number` |
| `started_at` | `started_at` |
| `talking_time` | `talking_time` |
| `waiting_time` | `waiting_time` |
| `recording_url` | `recording_url` |
| `note` | `note` |

This trigger exposes no `ended_at`, `answered_at` or `status`, so those columns
stay null — nothing depends on them. `direction` arrives as `outgoing` /
`incoming` and is normalised to outbound/inbound. `external_number` is the
customer's leg and is what contact matching uses, so it is the one row that must
be right.

### Workflow B — "Recording uploaded → CRM"

Trigger: **Recording → Uploaded**. Add a **Speech to Text** action first (it is
only available on this trigger), then the API Request.

| Key | Value |
| --- | --- |
| `event` | `call.recording` (literal text) |
| `call_id` | `call_id` |
| `recording_url` | `recording_url` |

### Workflow C — "Transcription ready → CRM"

Trigger: **Transcription**, which fires once a transcription has been created
for a recording. This is the one that produces the note.

| Key | Value |
| --- | --- |
| `event` | `call.transcription` (literal text) |
| `call_id` | `call_id` |
| `transcript` | the transcription text property |

Triggers B and C have their own data panels with their own property names —
check each one rather than assuming they match Workflow A. Whatever they are,
the whole body is stored under `raw_payload` so a mismatch is recoverable.

**The property names above are the documented shape, but CloudTalk's template
variables vary by account and trigger version.** The handler accepts the common
aliases (`callId`, `cdr_id`, `caller_number`, `transcription_text`, …) and
stores each event's body under its own key in `phone_calls.raw_payload`.

Two ways to find the real names once a call exists — see §6 for the second.

## 3. Retry sweep

If the inline note generation fails (AI gateway down, timeout), the call is
saved with `ai_processed_at` null and picked up by the sweep. Schedule it:

```sql
select cron.schedule(
  'cloudtalk-process-pending',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://rkgjkvghejcmostuqkgw.supabase.co/functions/v1/cloudtalk-process-call',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{"sweep": true, "limit": 25}'::jsonb
  );
  $$
);
```

## 4. What lands in the CRM

`phone_calls` — one row per call: direction, numbers, agent, timings, status,
recording URL, transcript, and the generated `ai_summary` / `ai_notes` /
`ai_outcome` / `ai_sentiment`.

Call audio — mirrored into the private `cloudtalk-recordings` bucket, path on
`phone_calls.recording_storage_path`. The bucket is private and readable only
by admins; serve it with a signed URL, never a public one:

```ts
const { data } = await supabase.storage
  .from("cloudtalk-recordings")
  .createSignedUrl(call.recording_storage_path, 60 * 10);
```

This is a new bucket rather than the existing `call-recordings` one, which was
created outside migrations and holds the in-browser meeting recordings.

`contact_events` — the timeline the team actually reads:

- `event_type = 'call'` — the note. Summary, bullet points, outcome, sentiment,
  talk time, agent.
- `event_type = 'callback'` — only when a callback was actually agreed on the
  call, with `callback_at` set. Existing CRM views that read `callback_at` pick
  these up with no change.

Contacts are matched on the last 9 digits of the number, so `+44 7700 900123`,
`07700900123` and `447700900123` all reach the same record. An unrecognised
number creates a contact with `source = 'cloudtalk'` rather than dropping the
call.

## 5. Call recording and consent

This pipeline assumes calls are recorded and transcribed. Recording is
configured in CloudTalk, not here — but before switching it on account-wide:

- Recording consent rules vary by jurisdiction (all-party consent applies in
  several US states; the UK and EU need a lawful basis and notice under
  UK GDPR / GDPR).
- CloudTalk supports per-country recording rules and an automatic consent
  announcement at the start of a call. Turn these on for the territories you
  dial rather than relying on a blanket setting.
- Transcripts are personal data. They sit in `phone_calls.transcript` under the
  same admin-only RLS as the rest of the CRM, and are covered by whatever
  retention policy applies to contact records.

Worth a look from whoever owns data protection before this goes live across the
whole team.

## 6. Checking field names against the REST API

The public API is a second, independent way to see what CloudTalk actually
records for a call — useful because the workflow template variables in §2 are
the part that can't be verified up front.

Base URL is `https://my.cloudtalk.io/api/`, Basic auth with the key ID and
secret. Responses come back CakePHP-style: wrapped in `responseData` and nested
under a model name.

```json
{"responseData": {"itemsCount": 1, "pageCount": 1, "data": [{"Agent": {"id": "…"}}]}}
```

After making one test call, this shows the real call record and its field names:

```bash
curl -s -u "$CLOUDTALK_API_KEY_ID:$CLOUDTALK_API_KEY_SECRET" \
  'https://my.cloudtalk.io/api/calls/index.json?limit=1' | jq .
```

Compare those keys against the aliases in
`supabase/functions/_shared/cloudtalk.ts` and add any that are missing.

Other endpoints worth knowing, all with the same envelope:
`agents/index.json`, `numbers/index.json`, `campaigns/index.json`.

### Account state when this was built

Checked against the live account on 2026-08-03: one agent (ext 1001), one UK
number (`+447830342069`), **zero calls and zero campaigns**. Nothing to backfill,
and nothing to validate the payload shape against until the first call is made.
