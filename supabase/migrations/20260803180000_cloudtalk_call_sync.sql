-- CloudTalk telephony sync.
-- Every call CloudTalk handles lands in public.phone_calls, gets matched to a
-- contact, and (once the transcript arrives) produces a timeline note and an
-- optional callback on public.contact_events.

-- CloudTalk and the CRM store numbers in different shapes: +44 7700 900123,
-- 07700900123, 447700900123. The last 9 digits are stable across national and
-- international prefixes for the ranges we deal with, so match on those.
CREATE OR REPLACE FUNCTION public.normalize_phone(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(right(regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g'), 9), '')
$$;

CREATE INDEX IF NOT EXISTS contacts_normalized_phone_idx
  ON public.contacts (public.normalize_phone(phone))
  WHERE phone IS NOT NULL;

-- Oldest match wins, so repeat callers stay pinned to their original record
-- rather than hopping to a duplicate created later.
CREATE OR REPLACE FUNCTION public.find_contact_by_phone(_phone text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.contacts
  WHERE public.normalize_phone(_phone) IS NOT NULL
    AND public.normalize_phone(phone) = public.normalize_phone(_phone)
  ORDER BY created_at ASC
  LIMIT 1
$$;

-- SECURITY DEFINER, so keep it off the public API surface.
REVOKE ALL ON FUNCTION public.find_contact_by_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_contact_by_phone(text) TO service_role;

CREATE TABLE IF NOT EXISTS public.phone_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'cloudtalk',
  provider_call_id text NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,

  -- Left as free text rather than CHECK-constrained: an unrecognised CloudTalk
  -- value should still be recorded, not rejected at the door.
  direction text NOT NULL DEFAULT 'unknown',
  status text,

  from_number text,
  to_number text,
  -- The customer's number, whichever leg it was on. This is what we match with.
  external_number text,
  agent_name text,
  agent_email text,

  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  talk_time_seconds integer,
  waiting_time_seconds integer,

  -- recording_url is CloudTalk's own link and needs CloudTalk credentials to
  -- open; recording_storage_path is our mirrored copy that the CRM can play.
  recording_url text,
  recording_storage_path text,
  recording_mime_type text,
  recording_size_bytes bigint,
  transcript text,

  ai_summary text,
  ai_notes text,
  ai_outcome text,
  ai_sentiment text,
  ai_processed_at timestamptz,
  ai_error text,

  -- Timeline rows this call produced, so reprocessing updates instead of duplicating.
  note_event_id uuid REFERENCES public.contact_events(id) ON DELETE SET NULL,
  callback_event_id uuid REFERENCES public.contact_events(id) ON DELETE SET NULL,

  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CloudTalk retries workflow actions, and fires separate events for the call,
-- the recording and the transcript. All of them upsert onto this key.
CREATE UNIQUE INDEX IF NOT EXISTS phone_calls_provider_call_idx
  ON public.phone_calls (provider, provider_call_id);

CREATE INDEX IF NOT EXISTS phone_calls_contact_idx ON public.phone_calls (contact_id);
CREATE INDEX IF NOT EXISTS phone_calls_started_at_idx ON public.phone_calls (started_at DESC);
CREATE INDEX IF NOT EXISTS phone_calls_external_number_idx
  ON public.phone_calls (public.normalize_phone(external_number))
  WHERE external_number IS NOT NULL;

-- Calls still waiting on AI notes, for the retry sweep.
CREATE INDEX IF NOT EXISTS phone_calls_pending_ai_idx
  ON public.phone_calls (created_at)
  WHERE ai_processed_at IS NULL;

DROP TRIGGER IF EXISTS update_phone_calls_updated_at ON public.phone_calls;
CREATE TRIGGER update_phone_calls_updated_at
  BEFORE UPDATE ON public.phone_calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON public.phone_calls TO service_role;

ALTER TABLE public.phone_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view phone calls" ON public.phone_calls;
CREATE POLICY "Admins view phone calls"
  ON public.phone_calls FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update phone calls" ON public.phone_calls;
CREATE POLICY "Admins update phone calls"
  ON public.phone_calls FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Private bucket for mirrored call audio. Deliberately not the existing
-- 'call-recordings' bucket: that one was created outside migrations, so its
-- public flag can't be verified from here. Recordings are personal data and
-- must not sit in a public bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('cloudtalk-recordings', 'cloudtalk-recordings', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Admins read cloudtalk recordings" ON storage.objects;
CREATE POLICY "Admins read cloudtalk recordings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cloudtalk-recordings' AND has_role(auth.uid(), 'admin'::app_role));

-- Callbacks the CRM owes: an open contact_events row with a due time.
CREATE INDEX IF NOT EXISTS contact_events_callback_due_idx
  ON public.contact_events (callback_at)
  WHERE callback_at IS NOT NULL AND completed_at IS NULL;
