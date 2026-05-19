
# Twilio Two-Way Marketing SMS Broadcasts

Add a marketing SMS broadcast system to the admin portal: select clients, compose a message, send via Twilio, receive replies, and handle STOP/opt-outs for UK PECR compliance.

## Twilio free tier — short answer

Twilio gives a **free trial credit (~$15 USD)** when you sign up. Caveats:
- Trial can only send to **verified numbers** you add in the console.
- Messages get a prepended "Sent from your Twilio trial account" prefix.
- For real marketing volume you must upgrade (pay-as-you-go, no monthly fee). UK SMS is roughly £0.04/msg + ~£1/month per sender ID or alphanumeric. There is no permanent free tier for production sending.

So: fine to build + test for free, but going live with 10K+/month needs a funded account.

---

## Step-by-step plan

### 1. Connect Twilio + add sender
- Link the Twilio connector via the Lovable Cloud connector picker (sets `TWILIO_API_KEY` for the gateway).
- In Twilio console: buy a UK long-code or register an **alphanumeric sender ID** ("Pixcellor"), enable **SMS Pumping Protection** and restrict **SMS Geo Permissions** to UK only.
- Store the active sender in `sms_settings` (see schema).

### 2. Database schema (new tables)
- `sms_broadcasts` — one row per campaign (body, sender, status, counts, created_by).
- `sms_messages` — one row per recipient send (broadcast_id, contact_id, contact_person_id, to_phone, direction in/out, twilio_sid, status, error_code, body, sent_at, delivered_at).
- `sms_inbound_replies` — incoming replies linked to contact by phone match.
- `sms_opt_outs` — phone numbers that sent STOP / were manually suppressed (UK PECR record).
- `sms_settings` — singleton: active sender ID, default footer, rate-limit config.
- All tables admin-only RLS + service role full access.

### 3. Edge functions
- `send-sms-broadcast` (admin JWT): validates body with Zod, resolves recipients from `contacts`/`contact_persons` phones, filters out `sms_opt_outs`, inserts `sms_broadcast` + queued `sms_messages`, then enqueues background send.
- `process-sms-queue` (cron, every minute via `pg_cron` + `pg_net`): pulls queued `sms_messages` in batches, calls Twilio gateway `POST /Messages.json` with rate limiting, appends mandatory "Reply STOP to opt out" footer, updates status with `twilio_sid`.
- `twilio-status-webhook` (public, signature-verified, `verify_jwt = false`): updates `sms_messages.status` from Twilio delivery callbacks.
- `twilio-inbound-webhook` (public, signature-verified, `verify_jwt = false`): receives replies, auto-handles `STOP`/`UNSUB`/`STOPALL` → insert into `sms_opt_outs`, send confirmation, else store in `sms_inbound_replies` and create a `contact_events` note.
- All Twilio calls go through `https://connector-gateway.lovable.dev/twilio/Messages.json` using `LOVABLE_API_KEY` + `TWILIO_API_KEY` headers.

### 4. Portal UI (new tab in `/portal`)
- **Broadcasts tab**:
  - List of past broadcasts with status counts (sent / delivered / failed / replied).
  - "New broadcast" drawer: filter contacts (status, industry, location, has-phone), preview recipient count, compose message (160-char counter, GSM-7 vs UCS-2 indicator, auto-footer preview), test-send to one number, schedule or send now.
  - Per-broadcast detail view: recipient table, delivery status, replies inline.
- **Replies inbox**: combined view of `sms_inbound_replies`, mark as handled, links into the existing contact card.
- **Opt-outs panel**: searchable list, manual add/remove.

### 5. Compliance + safety
- Mandatory `STOP` footer appended server-side (cannot be removed).
- Hard block on sending to numbers in `sms_opt_outs`.
- Per-broadcast confirmation modal showing recipient count + estimated cost (recipients × £0.04).
- Rate limit: max N messages/sec to respect Twilio carrier limits.
- Quiet hours guard (default 21:00–08:00 UK) with override toggle.
- Log every send in `sms_messages` with full Twilio response for audit.

### 6. Rollout order
1. Schema migration + RLS.
2. Connect Twilio, store sender in `sms_settings`.
3. `send-sms-broadcast` + `process-sms-queue` + cron.
4. Inbound + status webhooks (give URLs to paste into Twilio console).
5. Portal UI: compose + recipient list.
6. Replies inbox + opt-out panel.
7. End-to-end test with trial credit before flipping to paid.

## Technical notes
- Twilio gateway path is `/Messages.json` (gateway auto-prefixes `/2010-04-01/Accounts/{AccountSid}`), body must be `application/x-www-form-urlencoded` via `URLSearchParams`.
- Verify Twilio webhook signatures using `X-Twilio-Signature` + auth token (token must be set as a separate `TWILIO_AUTH_TOKEN` secret since signature verification can't go through the gateway).
- Use `pg_cron` for the queue worker (not client-driven), pattern matches existing `process-email-queue`.
- Phone normalization to E.164 (`+44...`) before storing and before matching inbound replies to contacts.
