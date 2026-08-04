-- Let the agent track every call recording against a CRM contact, and keep the
-- notes it takes on the call next to the recording itself.
ALTER TABLE public.call_recordings
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS logged_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_call_recordings_contact_id
  ON public.call_recordings (contact_id);

CREATE INDEX IF NOT EXISTS idx_call_recordings_booking_id
  ON public.call_recordings (booking_id);

CREATE INDEX IF NOT EXISTS idx_call_recordings_created_at
  ON public.call_recordings (created_at DESC);

-- Bookings already carry contact_id; index it so the "which calls aren't linked
-- to a client yet?" sweep stays cheap as the table grows.
CREATE INDEX IF NOT EXISTS idx_call_bookings_contact_id
  ON public.call_bookings (contact_id);

-- Backfill: link any recording whose booking is already matched to a contact.
UPDATE public.call_recordings r
   SET contact_id = b.contact_id
  FROM public.call_bookings b
 WHERE r.booking_id = b.id
   AND r.contact_id IS NULL
   AND b.contact_id IS NOT NULL;
