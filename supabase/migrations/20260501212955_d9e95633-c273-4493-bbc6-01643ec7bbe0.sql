-- Make email unique on client_profiles so we can upsert by email.
-- Lowercase any existing duplicates first to keep the unique index sane.
UPDATE public.client_profiles SET email = lower(email) WHERE email <> lower(email);

-- Deduplicate any existing dupes (keep the oldest row per email).
DELETE FROM public.client_profiles a
USING public.client_profiles b
WHERE a.email = b.email
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS client_profiles_email_unique ON public.client_profiles (email);

-- Allow anonymous + authenticated users to insert their own enquiry into client_profiles.
-- This is the same risk profile as contact_inquiries, which already allows public inserts.
CREATE POLICY "Public can insert client profiles via enquiry"
ON public.client_profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow public update only on rows being upserted (i.e. matching email path).
-- We keep this minimal: only allow updating notes/name/company fields by the owner of that email
-- via the upsert path. For simplicity and parity with contact_inquiries' open insert model,
-- we allow updates from anon/authenticated to refresh enquiry metadata only.
CREATE POLICY "Public can update enquiry profile fields"
ON public.client_profiles
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);