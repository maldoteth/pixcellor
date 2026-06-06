-- Candidate availability table for self-service availability calendar
CREATE TABLE IF NOT EXISTS public.candidate_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  avail_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('available','unavailable','tentative')),
  start_time time NULL,
  finish_time time NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, avail_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_availability TO authenticated;
GRANT ALL ON public.candidate_availability TO service_role;

ALTER TABLE public.candidate_availability ENABLE ROW LEVEL SECURITY;

-- Only the linked candidate (matched by email = auth user email) can manage their own rows.
CREATE POLICY "Candidate can view own availability"
ON public.candidate_availability FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id = candidate_availability.candidate_id
      AND lower(c.email) = lower((auth.jwt() ->> 'email'))
  )
);

CREATE POLICY "Candidate can insert own availability"
ON public.candidate_availability FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id = candidate_availability.candidate_id
      AND lower(c.email) = lower((auth.jwt() ->> 'email'))
  )
);

CREATE POLICY "Candidate can update own availability"
ON public.candidate_availability FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id = candidate_availability.candidate_id
      AND lower(c.email) = lower((auth.jwt() ->> 'email'))
  )
);

CREATE POLICY "Candidate can delete own availability"
ON public.candidate_availability FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id = candidate_availability.candidate_id
      AND lower(c.email) = lower((auth.jwt() ->> 'email'))
  )
);

-- Admins (have any role row) can view all availability
CREATE POLICY "Admins view all availability"
ON public.candidate_availability FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS candidate_availability_candidate_date_idx
  ON public.candidate_availability (candidate_id, avail_date);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_candidate_availability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_candidate_availability ON public.candidate_availability;
CREATE TRIGGER trg_touch_candidate_availability
BEFORE UPDATE ON public.candidate_availability
FOR EACH ROW EXECUTE FUNCTION public.touch_candidate_availability();

-- RPC: fetch availability for current candidate within a date range
CREATE OR REPLACE FUNCTION public.portal_my_availability(_from date, _to date)
RETURNS TABLE (
  id uuid,
  candidate_id uuid,
  avail_date date,
  status text,
  start_time time,
  finish_time time,
  note text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.candidate_id, a.avail_date, a.status, a.start_time, a.finish_time, a.note
  FROM public.candidate_availability a
  JOIN public.candidates c ON c.id = a.candidate_id
  WHERE lower(c.email) = lower((auth.jwt() ->> 'email'))
    AND a.avail_date BETWEEN _from AND _to
  ORDER BY a.avail_date;
$$;

-- RPC: upsert availability for current candidate
CREATE OR REPLACE FUNCTION public.portal_set_availability(
  _date date,
  _status text,
  _start time DEFAULT NULL,
  _finish time DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id uuid;
  v_id uuid;
BEGIN
  SELECT c.id INTO v_candidate_id
  FROM public.candidates c
  WHERE lower(c.email) = lower((auth.jwt() ->> 'email'))
  LIMIT 1;

  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'No candidate record linked to your account';
  END IF;

  INSERT INTO public.candidate_availability (candidate_id, avail_date, status, start_time, finish_time, note)
  VALUES (v_candidate_id, _date, _status, _start, _finish, _note)
  ON CONFLICT (candidate_id, avail_date)
  DO UPDATE SET status = EXCLUDED.status,
                start_time = EXCLUDED.start_time,
                finish_time = EXCLUDED.finish_time,
                note = EXCLUDED.note,
                updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_delete_availability(_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id uuid;
BEGIN
  SELECT c.id INTO v_candidate_id
  FROM public.candidates c
  WHERE lower(c.email) = lower((auth.jwt() ->> 'email'))
  LIMIT 1;

  IF v_candidate_id IS NULL THEN RETURN; END IF;

  DELETE FROM public.candidate_availability
  WHERE candidate_id = v_candidate_id AND avail_date = _date;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_my_availability(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_set_availability(date, text, time, time, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_delete_availability(date) TO authenticated;
