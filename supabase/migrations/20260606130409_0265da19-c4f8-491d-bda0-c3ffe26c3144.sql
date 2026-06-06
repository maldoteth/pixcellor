CREATE OR REPLACE FUNCTION public.portal_set_shift_candidate(_vacancy_id uuid, _slot integer, _date date, _candidate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start time;
  v_finish time;
  s_start time;
  s_finish time;
  conflict_title text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT start_time, finish_time
    INTO v_start, v_finish
    FROM public.vacancies
   WHERE id = _vacancy_id;

  SELECT vs.start_time, vs.finish_time
    INTO s_start, s_finish
    FROM public.vacancy_shifts vs
   WHERE vs.vacancy_id = _vacancy_id
     AND vs.slot_index = coalesce(_slot, 0)
     AND vs.shift_date = _date;

  s_start := coalesce(s_start, v_start);
  s_finish := coalesce(s_finish, v_finish);

  IF _candidate_id IS NOT NULL AND s_start IS NOT NULL AND s_finish IS NOT NULL THEN
    SELECT v2.title INTO conflict_title
      FROM public.vacancy_shifts vs2
      JOIN public.vacancies v2 ON v2.id = vs2.vacancy_id
     WHERE vs2.shift_date = _date
       AND vs2.candidate_id = _candidate_id
       AND vs2.cancelled = false
       AND NOT (vs2.vacancy_id = _vacancy_id AND vs2.slot_index = coalesce(_slot, 0))
       AND public._times_overlap(s_start, s_finish, coalesce(vs2.start_time, v2.start_time), coalesce(vs2.finish_time, v2.finish_time))
     LIMIT 1;

    IF conflict_title IS NOT NULL THEN
      RAISE EXCEPTION 'Candidate already booked on % for "%"', _date, conflict_title;
    END IF;

    SELECT v3.title INTO conflict_title
      FROM public.vacancy_assignments va3
      JOIN public.vacancies v3 ON v3.id = va3.vacancy_id
     WHERE va3.candidate_id = _candidate_id
       AND va3.vacancy_id <> _vacancy_id
       AND va3.stage IN ('shortlisted','submitted','interviewing','offer','placed')
       AND coalesce(v3.start_date, _date) <= _date
       AND coalesce(v3.end_date, _date) >= _date
       AND (
         v3.schedule_days IS NULL OR array_length(v3.schedule_days, 1) IS NULL
         OR EXISTS (
           SELECT 1 FROM unnest(v3.schedule_days) d
           WHERE lower(left(d, 3)) = lower(to_char(_date, 'Dy'))
         )
       )
       AND public._times_overlap(s_start, s_finish, v3.start_time, v3.finish_time)
       AND NOT EXISTS (
         SELECT 1 FROM public.vacancy_shifts vs4
          WHERE vs4.vacancy_id = va3.vacancy_id
            AND vs4.slot_index = va3.slot_index
            AND vs4.shift_date = _date
            AND (vs4.cancelled = true OR (vs4.assignment_overridden = true AND coalesce(vs4.candidate_id::text, '') <> _candidate_id::text))
       )
     LIMIT 1;

    IF conflict_title IS NOT NULL THEN
      RAISE EXCEPTION 'Candidate already booked on % for "%"', _date, conflict_title;
    END IF;
  END IF;

  INSERT INTO public.vacancy_shifts (vacancy_id, slot_index, shift_date, start_time, finish_time, cancelled, candidate_id, assignment_overridden)
  VALUES (_vacancy_id, coalesce(_slot, 0), _date, s_start, s_finish, false, _candidate_id, true)
  ON CONFLICT (vacancy_id, slot_index, shift_date) DO UPDATE
    SET cancelled = false,
        candidate_id = _candidate_id,
        assignment_overridden = true,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_set_shift_candidate(uuid, integer, date, uuid) TO authenticated, service_role;