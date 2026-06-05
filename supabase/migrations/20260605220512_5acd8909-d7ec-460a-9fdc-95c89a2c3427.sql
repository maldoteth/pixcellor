
-- 1. Table
CREATE TABLE public.vacancy_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  start_time time,
  finish_time time,
  cancelled boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vacancy_id, shift_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacancy_shifts TO authenticated;
GRANT ALL ON public.vacancy_shifts TO service_role;

ALTER TABLE public.vacancy_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vacancy shifts"
  ON public.vacancy_shifts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX vacancy_shifts_vacancy_date_idx
  ON public.vacancy_shifts(vacancy_id, shift_date);

CREATE TRIGGER vacancy_shifts_updated_at
  BEFORE UPDATE ON public.vacancy_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. List shifts in a date range
CREATE OR REPLACE FUNCTION public.portal_list_vacancy_shifts(
  _vacancy_id uuid,
  _from date,
  _to date
) RETURNS TABLE (
  id uuid,
  vacancy_id uuid,
  shift_date date,
  start_time time,
  finish_time time,
  cancelled boolean,
  notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.vacancy_id, s.shift_date, s.start_time, s.finish_time, s.cancelled, s.notes
  FROM public.vacancy_shifts s
  WHERE s.vacancy_id = _vacancy_id
    AND s.shift_date BETWEEN _from AND _to
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY s.shift_date ASC;
$$;

-- 3. Upsert a shift for a specific date
CREATE OR REPLACE FUNCTION public.portal_upsert_vacancy_shift(
  _vacancy_id uuid,
  _date date,
  _start time,
  _finish time,
  _cancelled boolean DEFAULT false,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.vacancy_shifts (vacancy_id, shift_date, start_time, finish_time, cancelled, notes)
  VALUES (_vacancy_id, _date, _start, _finish, COALESCE(_cancelled, false), _notes)
  ON CONFLICT (vacancy_id, shift_date)
  DO UPDATE SET
    start_time = EXCLUDED.start_time,
    finish_time = EXCLUDED.finish_time,
    cancelled = EXCLUDED.cancelled,
    notes = EXCLUDED.notes,
    updated_at = now()
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- 4. Delete a shift on a date
CREATE OR REPLACE FUNCTION public.portal_delete_vacancy_shift(
  _vacancy_id uuid,
  _date date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.vacancy_shifts
  WHERE vacancy_id = _vacancy_id AND shift_date = _date;
END;
$$;

-- 5. Copy a source date shift to a target date (also works when source is the weekly template)
CREATE OR REPLACE FUNCTION public.portal_copy_vacancy_shift(
  _vacancy_id uuid,
  _source_date date,
  _target_date date
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _src record;
  _v record;
  _start time;
  _finish time;
  _id uuid;
  _dow_short text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT start_time, finish_time, notes INTO _src
  FROM public.vacancy_shifts
  WHERE vacancy_id = _vacancy_id AND shift_date = _source_date AND cancelled = false;

  IF FOUND THEN
    _start := _src.start_time;
    _finish := _src.finish_time;
  ELSE
    -- Fall back to the vacancy template times if the source day is part of schedule_days
    SELECT start_time, finish_time, schedule_days INTO _v FROM public.vacancies WHERE id = _vacancy_id;
    _dow_short := to_char(_source_date, 'Dy');
    IF _v.schedule_days IS NULL OR NOT (_dow_short = ANY(_v.schedule_days)) THEN
      RAISE EXCEPTION 'Source date has no shift to copy';
    END IF;
    _start := _v.start_time;
    _finish := _v.finish_time;
  END IF;

  INSERT INTO public.vacancy_shifts (vacancy_id, shift_date, start_time, finish_time, cancelled)
  VALUES (_vacancy_id, _target_date, _start, _finish, false)
  ON CONFLICT (vacancy_id, shift_date)
  DO UPDATE SET
    start_time = EXCLUDED.start_time,
    finish_time = EXCLUDED.finish_time,
    cancelled = false,
    updated_at = now()
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;
