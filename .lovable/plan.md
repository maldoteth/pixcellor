## Why the latest AI generation didn't show up as a hot lead

The Clients tab reads from the `contacts` table. The `generate-vision` edge function only inserts into `ai_sample_generations` — it never creates or updates a row in `contacts`. So even though the latest run captured `d@d.com` / `9123933993` / company "jim", no hot lead was created.

Confirmed in the DB:
- `ai_sample_generations` has the new row (email + phone present).
- `contacts` has no matching new row — the only `d@d.com` contact is an older one from `stripe_checkout_started`.
- No trigger exists on `ai_sample_generations` to mirror it into `contacts`.

## Fix plan

Add a contact upsert step in `supabase/functions/generate-vision/index.ts`, right after the `ai_sample_generations` insert, only when the request carries an email or phone.

### Behaviour

- Look up an existing contact by email (case-insensitive) first, then by phone if no email match.
- If found:
  - Fill in missing fields only (name/company/email/phone), never overwrite existing data.
  - Bump `status` to `hot` unless it's already `gold` or `archived` (don't demote VIPs or revive archived leads).
  - Update `updated_at`.
- If not found:
  - Insert a new contact with:
    - `name`: company (or "AI sample lead" fallback — `name` is NOT NULL).
    - `email`, `phone`, `contact_name` (= name from meta if any), `industry: 'general'` (default).
    - `status: 'hot'`.
    - `source: 'ai_vision_generator'`.
    - `notes`: brief one-liner like "AI sample generated for {company} — {date}".
- Wrap in try/catch and log errors; do not fail the generation response if the contact write fails.

### Why "hot"

Capturing email + phone before AI generation is a strong intent signal — matches the existing `hot` semantic in `STATUS_OPTIONS`.

### Files to change

- `supabase/functions/generate-vision/index.ts` — add the upsert block after the `ai_sample_generations` insert.

No DB migration is required (the `contacts` table already has all needed columns and a permissive service-role policy).

### After deploy

Trigger one fresh AI generation with email+phone and verify a new `contacts` row appears with `status = 'hot'` and `source = 'ai_vision_generator'`, then confirm it shows in the Clients tab under Hot.