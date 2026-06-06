
CREATE OR REPLACE FUNCTION public.candidate_timesheet_clock_in(_vacancy_id uuid, _slot integer, _date date)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_candidate uuid := public._candidate_for_auth_user();
  v_slot int := _slot;
  v_sched_start time;
  v_sched_finish time;
  v_row public.shift_timesheets%rowtype;
BEGIN
  IF v_candidate IS NULL THEN RAISE EXCEPTION 'No linked candidate profile'; END IF;

  IF v_slot IS NULL THEN
    SELECT min(slot_index) INTO v_slot
      FROM public.vacancy_assignments
     WHERE vacancy_id = _vacancy_id
       AND candidate_id = v_candidate
       AND stage IN ('shortlisted','submitted','interviewing','offer','placed');
    v_slot := coalesce(v_slot, 0);
  END IF;

  SELECT coalesce(vs.start_time, v.start_time), coalesce(vs.finish_time, v.finish_time)
    INTO v_sched_start, v_sched_finish
    FROM public.vacancies v
    LEFT JOIN public.vacancy_shifts vs
      ON vs.vacancy_id = v.id AND vs.slot_index = v_slot AND vs.shift_date = _date
   WHERE v.id = _vacancy_id;

  INSERT INTO public.shift_timesheets (
    vacancy_id, slot_index, shift_date, candidate_id,
    scheduled_start, scheduled_finish, actual_start, status
  ) VALUES (
    _vacancy_id, v_slot, _date, v_candidate,
    v_sched_start, v_sched_finish, now(), 'pending'
  )
  ON CONFLICT (vacancy_id, slot_index, shift_date, candidate_id) DO UPDATE
    SET actual_start = coalesce(public.shift_timesheets.actual_start, EXCLUDED.actual_start),
        status = CASE WHEN public.shift_timesheets.status IN ('approved','rejected') THEN public.shift_timesheets.status ELSE 'pending' END,
        updated_at = now()
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END; $$;
