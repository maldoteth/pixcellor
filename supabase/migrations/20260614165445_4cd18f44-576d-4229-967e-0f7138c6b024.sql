
-- Tokens on call_bookings
ALTER TABLE public.call_bookings
  ADD COLUMN IF NOT EXISTS host_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS guest_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS call_bookings_host_token_idx ON public.call_bookings (host_token);
CREATE INDEX IF NOT EXISTS call_bookings_guest_token_idx ON public.call_bookings (guest_token);

-- Public RPC: verify a token and return room metadata. SECURITY DEFINER so anon can call.
CREATE OR REPLACE FUNCTION public.get_call_room(p_booking uuid, p_token uuid)
RETURNS TABLE (
  booking_id uuid,
  role text,
  display_name text,
  scheduled_at timestamptz,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cb.id,
    CASE
      WHEN cb.host_token = p_token THEN 'host'
      WHEN cb.guest_token = p_token THEN 'guest'
      ELSE NULL
    END AS role,
    CASE
      WHEN cb.host_token = p_token THEN 'Pixcellor team'
      ELSE cb.name
    END AS display_name,
    cb.scheduled_at,
    cb.status
  FROM public.call_bookings cb
  WHERE cb.id = p_booking
    AND (cb.host_token = p_token OR cb.guest_token = p_token);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_call_room(uuid, uuid) TO anon, authenticated;

-- Recordings table
CREATE TABLE IF NOT EXISTS public.call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.call_bookings(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'video/webm',
  size_bytes bigint,
  duration_seconds integer,
  recorded_by text NOT NULL DEFAULT 'host',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_recordings_booking_idx ON public.call_recordings(booking_id);

GRANT SELECT, INSERT ON public.call_recordings TO authenticated;
GRANT ALL ON public.call_recordings TO service_role;

ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view recordings"
  ON public.call_recordings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert recordings"
  ON public.call_recordings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
