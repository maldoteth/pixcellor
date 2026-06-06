
ALTER TABLE public.vacancy_shifts
  ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_overridden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS vacancy_shifts_candidate_date_idx
  ON public.vacancy_shifts (candidate_id, shift_date)
  WHERE candidate_id IS NOT NULL;

-- Helper: does the given [s,f) time window overlap [s2,f2)? Treats null times as full-day.
CREATE OR REPLACE FUNCTION public._times_overlap(s1 time, f1 time, s2 time, f2 time)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
  SELECT
    COALESCE(s1, '00:00'::time) < COALESCE(f2, '23:59:59'::time)
    AND COALESCE(s2, '00:00'::time) < COALESCE(f1, '23:59:59'::time);
$$;

-- Updated list function: now returns candidate_id, assignment_overridden, candidate_name
DROP FUNCTION IF EXISTS public.portal_list_vacancy_shifts(uuid, date, date);
CREATE OR REPLACE FUNCTION public.portal_list_vacancy_shifts(_vacancy_id uuid, _from date, _to date)
RETURNS TABLE(
  id uuid, vacancy_id uuid, slot_index integer, shift_date date,
  start_time time without time zone, finish_time time without time zone,
  cancelled boolean, notes text,
  candidate_id uuid, assignment_overridden boolean, candidate_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.id, s.vacancy_id, s.slot_index, s.shift_date, s.start_time, s.finish_time,
         s.cancelled, s.notes, s.candidate_id, s.assignment_overridden, c.full_name
  FROM public.vacancy_shifts s
  LEFT JOIN public.candidates c ON c.id = s.candidate_id
  WHERE s.vacancy_id = _vacancy_id AND s.shift_date BETWEEN _from AND _to
    AND public.has_role(auth.uid(), 'admin');
$$;

-- Set / clear per-shift candidate. Pass _candidate_id = NULL to leave the day empty.
CREATE OR REPLACE FUNCTION public.portal_set_shift_candidate(
  _vacancy_id uuid, _slot integer, _date date, _candidate_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_start time; v_finish time;
  s_start time; s_finish time;
  conflict_row record;
  v_title text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT start_time, finish_time, title INTO v_start, v_finish, v_title
  FROM public.vacancies WHERE id = _vacancy_id;

  -- Effective times for this shift
  SELECT COALESCE(start_time, v_start), COALESCE(finish_time, v_finish)
  INTO s_start, s_finish
  FROM public.vacancy_shifts
  WHERE vacancy_id = _vacancy_id AND slot_index = _slot AND shift_date = _date;
  IF NOT FOUND THEN
    s_start := v_start; s_finish := v_finish;
  END IF;

  -- Conflict check if assigning a candidate
  IF _candidate_id IS NOT NULL THEN
    SELECT vs.vacancy_id, v.title, vs.start_time, vs.finish_time
    INTO conflict_row
    FROM public.vacancy_shifts vs
    JOIN public.vacancies v ON v.id = vs.vacancy_id
    WHERE vs.shift_date = _date
      AND vs.candidate_id = _candidate_id
      AND vs.assignment_overridden = true
      AND vs.cancelled = false
      AND NOT (vs.vacancy_id = _vacancy_id AND vs.slot_index = _slot)
      AND public._times_overlap(
        COALESCE(vs.start_time, v.start_time), COALESCE(vs.finish_time, v.finish_time),
        s_start, s_finish
      )
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'Worker already booked on % for "%" (%-%)',
        _date, conflict_row.title,
        COALESCE(conflict_row.start_time::text, 'any'), COALESCE(conflict_row.finish_time::text, 'any');
    END IF;
  END IF;

  INSERT INTO public.vacancy_shifts (vacancy_id, slot_index, shift_date, candidate_id, assignment_overridden)
  VALUES (_vacancy_id, _slot, _date, _candidate_id, true)
  ON CONFLICT (vacancy_id, slot_index, shift_date) DO UPDATE
    SET candidate_id = EXCLUDED.candidate_id,
        assignment_overridden = true,
        updated_at = now();
END; $$;

-- Updated slot-level assign with conflict check
CREATE OR REPLACE FUNCTION public.portal_assign_candidate_to_vacancy(
  _vacancy_id uuid, _candidate_id uuid, _stage text DEFAULT 'shortlisted'::text,
  _notes text DEFAULT NULL::text, _slot integer DEFAULT NULL::integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  admin_email text;
  openings_count integer;
  s integer;
  rows jsonb := '[]'::jsonb;
  one_row public.vacancy_assignments%ROWTYPE;
  v_start time; v_finish time;
  conflict_row record;
BEGIN
  PERFORM public.portal_require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.vacancies WHERE id = _vacancy_id) THEN RAISE EXCEPTION 'Vacancy not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.candidates WHERE id = _candidate_id) THEN RAISE EXCEPTION 'Candidate not found'; END IF;
  SELECT lower(email) INTO admin_email FROM auth.users WHERE id = auth.uid();
  SELECT greatest(coalesce(openings,1),1), start_time, finish_time
    INTO openings_count, v_start, v_finish
    FROM public.vacancies WHERE id = _vacancy_id;

  -- Conflict: any existing OVERRIDDEN shift in another vacancy that overlaps this vacancy's days/times
  SELECT vs2.shift_date, v2.title, COALESCE(vs2.start_time,v2.start_time) AS s2, COALESCE(vs2.finish_time,v2.finish_time) AS f2
  INTO conflict_row
  FROM public.vacancy_shifts vs1
  JOIN public.vacancies v1 ON v1.id = vs1.vacancy_id
  JOIN public.vacancy_shifts vs2 ON vs2.shift_date = vs1.shift_date AND vs2.candidate_id = _candidate_id AND vs2.assignment_overridden = true AND vs2.cancelled = false
  JOIN public.vacancies v2 ON v2.id = vs2.vacancy_id
  WHERE vs1.vacancy_id = _vacancy_id
    AND vs1.cancelled = false
    AND (_slot IS NULL OR vs1.slot_index = _slot)
    AND vs2.vacancy_id <> _vacancy_id
    AND public._times_overlap(
      COALESCE(vs1.start_time, v_start), COALESCE(vs1.finish_time, v_finish),
      COALESCE(vs2.start_time, v2.start_time), COALESCE(vs2.finish_time, v2.finish_time)
    )
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Worker already booked on % for "%"', conflict_row.shift_date, conflict_row.title;
  END IF;

  IF _slot IS NULL THEN
    FOR s IN 0..(openings_count - 1) LOOP
      INSERT INTO public.vacancy_assignments (vacancy_id, slot_index, candidate_id, stage, notes, assigned_by_user_id, assigned_by_email)
      VALUES (_vacancy_id, s, _candidate_id, coalesce(nullif(_stage,'')::public.vacancy_assignment_stage,'shortlisted'), nullif(trim(coalesce(_notes,'')),''), auth.uid(), admin_email)
      ON CONFLICT (vacancy_id, slot_index, candidate_id) DO UPDATE
        SET stage = EXCLUDED.stage, notes = coalesce(EXCLUDED.notes, public.vacancy_assignments.notes), updated_at = now()
      RETURNING * INTO one_row;
      rows := rows || to_jsonb(one_row);
    END LOOP;
  ELSE
    INSERT INTO public.vacancy_assignments (vacancy_id, slot_index, candidate_id, stage, notes, assigned_by_user_id, assigned_by_email)
    VALUES (_vacancy_id, _slot, _candidate_id, coalesce(nullif(_stage,'')::public.vacancy_assignment_stage,'shortlisted'), nullif(trim(coalesce(_notes,'')),''), auth.uid(), admin_email)
    ON CONFLICT (vacancy_id, slot_index, candidate_id) DO UPDATE
      SET stage = EXCLUDED.stage, notes = coalesce(EXCLUDED.notes, public.vacancy_assignments.notes), updated_at = now()
    RETURNING * INTO one_row;
    rows := rows || to_jsonb(one_row);
  END IF;
  RETURN rows;
END; $function$;
