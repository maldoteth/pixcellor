## Goal

Anna's Bees website calls our public `process-lets-talk-lead` endpoint using our anon key. Those leads aren't ours — they're hers. Treat them like the inbound webhook leads from DMB / Set In Stone: save the contact, tag the source, but don't schedule a callback, don't mark as hot, and don't pretend the company name is ours to act on.

## Detection

Identify a lead as Anna's Bees when the request body has `source === "annas_bees"` (Anna's Bees site will send this). Build a small `THIRD_PARTY_SOURCES` registry inside `supabase/functions/process-lets-talk-lead/index.ts` so we can add future partners (e.g. `annas_bees → { label: "Anna's Bees" }`) without code churn.

## Behaviour changes in `process-lets-talk-lead`

When the incoming `source` is in `THIRD_PARTY_SOURCES`:

1. **Company name** — ignore whatever `request_details.company` was sent. Store `contacts.name = "Unknown"` (matching how DMB / Set In Stone inbound contacts read).
2. **Note** — prepend a clear line: `Lead from Anna's Bees` (using the registry `label`), followed by any dream/colours/attachment summary the visitor provided. No "Let's Talk" headline for these.
3. **Status** — do NOT set `"hot"`. Use `"new"` (same default as the `contacts-ingest` webhook path) and never upgrade an existing contact's status from this code path.
4. **Callback scheduling** — skip entirely. Don't insert the `contact_events` "call back today" row even if a phone number is present.
5. **Welcome email** — skip. We shouldn't send our sales-welcome to a visitor who filled in Anna's form.
6. **client_profiles mirror** — skip. That table powers our own customer dashboard / enquiries view; these aren't our clients.
7. **Timeline event** — best-effort insert a `contact_events` row titled `Inbound from Anna's Bees` (mirroring the `contacts-ingest` pattern) so it shows on the contact timeline.

For all other sources, behaviour is unchanged.

## Files touched

- `supabase/functions/process-lets-talk-lead/index.ts` — add registry + branch on third-party source near the top of the handler, gate the callback / welcome / client_profiles / status-upgrade blocks behind `!isThirdParty`.

No DB migration, no frontend changes, no changes to `contacts-ingest` (Anna's Bees is staying on the Let's Talk endpoint with the anon key, per your message).

## Out of scope

- Giving Anna's Bees the bearer-token `contacts-ingest` route (existing decision: she uses the public Let's Talk endpoint).
- Rate-limiting / abuse protection on the public endpoint — flag if you want this next.
