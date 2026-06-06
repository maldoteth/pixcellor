
-- 1) New RPC: clear a per-shift override and revert to inherit slot default
CREATE OR REPLACE FUNCTION public.portal_clear_shift_override(_vacancy_id uuid, _slot integer, _date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.vacancy_shifts
     SET candidate_id = NULL,
         assignment_overridden = false,
         updated_at = now()
   WHERE vacancy_id = _vacancy_id
     AND slot_index = coalesce(_slot, 0)
     AND shift_date = _date;
END; $$;

GRANT EXECUTE ON FUNCTION public.portal_clear_shift_override(uuid, integer, date) TO authenticated, service_role;

-- 2) Trigger: when openings grow, copy ONLY shift schedule rows (not assignments)
CREATE OR REPLACE FUNCTION public.trg_recalc_vacancy_status_openings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s int;
BEGIN
  IF NEW.openings IS DISTINCT FROM OLD.openings THEN
    IF greatest(coalesce(NEW.openings, 1), 1) > greatest(coalesce(OLD.openings, 1), 1) THEN
      FOR s IN greatest(coalesce(OLD.openings, 1), 1)..(greatest(coalesce(NEW.openings, 1), 1) - 1) LOOP
        INSERT INTO public.vacancy_shifts (vacancy_id, slot_index, shift_date, start_time, finish_time, cancelled, notes)
        SELECT vacancy_id, s, shift_date, start_time, finish_time, cancelled, notes
        FROM public.vacancy_shifts
        WHERE vacancy_id = NEW.id AND slot_index = 0
        ON CONFLICT (vacancy_id, slot_index, shift_date) DO NOTHING;
        -- Intentionally NOT copying vacancy_assignments — new openings start unassigned.
      END LOOP;
    END IF;
    PERFORM public.recalc_vacancy_status(NEW.id);
  END IF;
  RETURN NEW;
END; $$;

-- 3) Clone helper: add _copy_assignments flag (default false)
CREATE OR REPLACE FUNCTION public.portal_clone_vacancy_slot(_vacancy_id uuid, _from_slot integer, _to_slot integer, _copy_assignments boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _from_slot = _to_slot THEN RETURN; END IF;

  INSERT INTO public.vacancy_shifts (vacancy_id, slot_index, shift_date, start_time, finish_time, cancelled, notes)
  SELECT vacancy_id, _to_slot, shift_date, start_time, finish_time, cancelled, notes
  FROM public.vacancy_shifts
  WHERE vacancy_id = _vacancy_id AND slot_index = _from_slot
  ON CONFLICT (vacancy_id, slot_index, shift_date) DO UPDATE
    SET start_time = EXCLUDED.start_time, finish_time = EXCLUDED.finish_time,
        cancelled = EXCLUDED.cancelled, updated_at = now();

  IF _copy_assignments THEN
    INSERT INTO public.vacancy_assignments (vacancy_id, slot_index, candidate_id, stage, notes)
    SELECT vacancy_id, _to_slot, candidate_id, stage, notes
    FROM public.vacancy_assignments
    WHERE vacancy_id = _vacancy_id AND slot_index = _from_slot
    ON CONFLICT (vacancy_id, slot_index, candidate_id) DO NOTHING;
  END IF;
END; $$;

-- 4) Tighten conflict check inside portal_set_shift_candidate — count any assignment, not just overridden
CREATE OR REPLACE FUNCTION public.portal_set_shift_candidate(_vacancy_id uuid, _slot integer, _date date, _candidate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start time; v_finish time;
  s_start time; s_finish time;
  conflict_title text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Get effective times for THIS shift (existing row first, fallback to vacancy template)
  SELECT vs.start_time, vs.finish_time INTO s_start, s_finish
    FROM public.vacancy_shifts vs
   WHERE vs.vacancy_id = _vacancy_id AND vs.slot_index = coalesce(_slot,0) AND vs.shift_date = _date;

  IF s_start IS NULL OR s_finish IS NULL THEN
    SELECT start_time, finish_time INTO v_start, v_finish FROM public.vacancies WHERE id = _vacancy_id;
    s_start := coalesce(s_start, v_start);
    s_finish := coalesce(s_finish, v_finish);
  END IF;

  IF _candidate_id IS NOT NULL AND s_start IS NOT NULL AND s_finish IS NOT NULL THEN
    -- Conflict A: another explicit shift row for same candidate on same day with overlapping time
    SELECT v2.title INTO conflict_title
      FROM public.vacancy_shifts vs2
      JOIN public.vacancies v2 ON v2.id = vs2.vacancy_id
     WHERE vs2.shift_date = _date
       AND vs2.candidate_id = _candidate_id
       AND vs2.cancelled = false
       AND NOT (vs2.vacancy_id = _vacancy_id AND vs2.slot_index = coalesce(_slot,0))
       AND public._times_overlap(s_start, s_finish, coalesce(vs2.start_time, v2.start_time), coalesce(vs2.finish_time, v2.finish_time))
     LIMIT 1;

    IF conflict_title IS NOT NULL THEN
      RAISE EXCEPTION 'Candidate already booked on % for "%"', _date, conflict_title;
    END IF;

    -- Conflict B: default slot-level assignment in another vacancy whose template covers this date and overlaps in time
    SELECT v3.title INTO conflict_title
      FROM public.vacancy_assignments va3
      JOIN public.vacancies v3 ON v3.id = va3.vacancy_id
     WHERE va3.candidate_id = _candidate_id
       AND va3.vacancy_id <> _vacancy_id
       AND va3.stage IN ('shortlisted','submitted','interviewing','offer','placed')
       AND coalesce(v3.start_date, _date) <= _date
       AND coalesce(v3.end_date, _date) >= _date
       AND (
         v3.schedule_days IS NULL OR array_length(v3.schedule_days,1) IS NULL
         OR EXISTS (
           SELECT 1 FROM unnest(v3.schedule_days) d
           WHERE lower(left(d,3)) = lower(to_char(_date, 'Dy'))
         )
       )
       AND public._times_overlap(s_start, s_finish, v3.start_time, v3.finish_time)
       -- but skip if that other vacancy has an explicit cancellation or override removing the candidate for this date
       AND NOT EXISTS (
         SELECT 1 FROM public.vacancy_shifts vs4
          WHERE vs4.vacancy_id = va3.vacancy_id
            AND vs4.slot_index = va3.slot_index
            AND vs4.shift_date = _date
            AND (vs4.cancelled = true OR (vs4.assignment_overridden = true AND coalesce(vs4.candidate_id::text,'') <> _candidate_id::text))
       )
     LIMIT 1;

    IF conflict_title IS NOT NULL THEN
      RAISE EXCEPTION 'Candidate already booked on % for "%"', _date, conflict_title;
    END IF;
  END IF;

  INSERT INTO public.vacancy_shifts (vacancy_id, slot_index, shift_date, candidate_id, assignment_overridden)
  VALUES (_vacancy_id, coalesce(_slot,0), _date, _candidate_id, true)
  ON CONFLICT (vacancy_id, slot_index, shift_date) DO UPDATE
    SET candidate_id = EXCLUDED.candidate_id,
        assignment_overridden = true,
        updated_at = now();
END; $$;
