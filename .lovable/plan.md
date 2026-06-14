# Booking system upgrade — Google Meet, .ics invites, reminders

## What changes for the customer

| Booking type | What they get |
|---|---|
| **Specific time slot** | Email with Google Meet link + .ics calendar invite + 24h reminder + 1h reminder |
| **Anytime / mornings / afternoons / evenings** | Email confirming we'll call their number — no Meet link, no .ics, no reminders (we ring them) |

## 1. Connect Google Calendar

Link the `google_calendar` connector to the Pixcellor Google account. All Meet links and calendar events are created in **your** calendar — customers get a normal invite from `you@pixcellor.com`.

## 2. Database

Add three columns to `call_bookings`:
- `meet_link text` — Google Meet URL (null for callback-window bookings)
- `google_event_id text` — so we can update/cancel later
- `reminders_sent jsonb default '{}'` — tracks `{"24h": true, "1h": true}` to prevent double-sends

## 3. `book-call` edge function

When `preference === "specific"`:
1. Insert booking row as today.
2. Call Google Calendar API via gateway: `POST /calendars/primary/events` with `conferenceData.createRequest` → returns event with `hangoutLink` (the Meet URL) and `id`.
3. Update booking row with `meet_link` + `google_event_id`.
4. Pass `meetLink` + ISO start/end into the confirmation email template.
5. Generate .ics string server-side and attach via the email send (note: current `send-transactional-email` doesn't support attachments — see Technical section).

When `preference !== "specific"`:
- Unchanged: confirmation email says "we'll call you on {phone}".

## 4. Email template updates

Edit `call-booking-confirmation.tsx`:
- If `meetLink` present → show prominent "Join Google Meet" button + "Add to calendar" link + the time + dial-in fallback (their phone if Meet fails).
- If no `meetLink` → keep current "we'll call you" copy.

Add two new templates:
- `call-booking-reminder-24h.tsx`
- `call-booking-reminder-1h.tsx`

Both include the Meet link, time, and a "need to reschedule? reply to this email" line.

## 5. Reminder cron

New edge function `send-call-reminders` (runs every 5 minutes via pg_cron):
- Finds `call_bookings` where `scheduled_at` is in the next 24h ± 5min window and `reminders_sent->>'24h'` is null → send 24h reminder, mark sent.
- Finds bookings where `scheduled_at` is in the next 1h ± 5min window and `reminders_sent->>'1h'` is null → send 1h reminder, mark sent.
- Skips cancelled bookings and callback-window bookings (no `scheduled_at`).

## 6. /get-started UI

Tiny copy tweak on the confirmation success screen:
- Specific slot → "Check your inbox — Google Meet link and calendar invite are on their way."
- Callback window → "Check your inbox — we'll ring you on {phone}."

---

## Technical section

**Google Calendar API call** (via connector gateway):
```
POST https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events?conferenceDataVersion=1
{
  summary: "Pixcellor call with {name}",
  description: "{brief}\n\nBooked via /get-started",
  start: { dateTime: scheduled_at, timeZone: "Europe/London" },
  end:   { dateTime: scheduled_at + 30min, timeZone: "Europe/London" },
  attendees: [{ email: customer.email }, { email: "you@pixcellor.com" }],
  conferenceData: { createRequest: { requestId: bookingId, conferenceSolutionKey: { type: "hangoutsMeet" } } },
  reminders: { useDefault: false }   // we send our own reminders
}
```
Returns `hangoutLink` (Meet URL) and `id` (event ID).

Headers: `Authorization: Bearer $LOVABLE_API_KEY`, `X-Connection-Api-Key: $GOOGLE_CALENDAR_API_KEY`.

**.ics attachment caveat**: the current `send-transactional-email` function doesn't support attachments. Two options:
- **A (recommended)**: rely on the Google Calendar event itself — Google auto-emails an invite to `attendees`, which already adds it to their calendar. Our confirmation email then just shows the Meet button + a "View in calendar" link to the event's `htmlLink`. **Zero extra work, customer gets a real invite from Google.**
- **B**: extend `send-transactional-email` to accept `attachments[]` and inline-generate .ics. More work, duplicates what Google already does.

I recommend **A** — it's simpler, more reliable, and the customer experience is better (they get a proper Google invite with RSVP buttons).

**Cron**: add `pg_cron` job hitting `send-call-reminders` every 5 minutes via `supabase--insert` (not migration, since it embeds the project URL + anon key).

**Failure handling**: if Google Calendar call fails, still save the booking and send the email without a Meet link, plus log to `admin_alerts` so you can manually add the call. Customer never sees a failure.

**Cost**: £0. Google Calendar API + Meet links are free. Reminders use existing Lovable Emails infra.

---

## Files touched

- `supabase/migrations/...` — add 3 columns to `call_bookings`
- `supabase/functions/book-call/index.ts` — create Google Calendar event for specific slots
- `supabase/functions/_shared/transactional-email-templates/call-booking-confirmation.tsx` — show Meet button when present
- `supabase/functions/_shared/transactional-email-templates/call-booking-reminder-24h.tsx` — new
- `supabase/functions/_shared/transactional-email-templates/call-booking-reminder-1h.tsx` — new
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — register new templates
- `supabase/functions/send-call-reminders/index.ts` — new cron worker
- `src/pages/GetStarted.tsx` — success-state copy tweak

## What I need from you before building

1. **Approve linking the Google Calendar connector** to your Pixcellor Google account (you'll click through a Google OAuth screen — takes ~20 seconds).
2. **Confirm the internal attendee email** to add to every event (so the call lands in your calendar too) — e.g. `hello@pixcellor.com`?
3. **Confirm option A** (rely on Google's native invite) vs option B (build .ics attachment support).
