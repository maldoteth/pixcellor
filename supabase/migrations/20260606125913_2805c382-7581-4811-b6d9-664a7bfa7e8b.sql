DROP FUNCTION IF EXISTS public.portal_clone_vacancy_slot(uuid, integer, integer, boolean);

CREATE OR REPLACE FUNCTION public.portal_clone_vacancy_slot(_vacancy_id uuid, _from_slot integer, _to_slot integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _from_slot = _to_slot THEN
    RETURN;
  END IF;

  INSERT INTO public.vacancy_shifts (vacancy_id, slot_index, shift_date, start_time, finish_time, cancelled, notes)
  SELECT vacancy_id, _to_slot, shift_date, start_time, finish_time, cancelled, notes
    FROM public.vacancy_shifts
   WHERE vacancy_id = _vacancy_id
     AND slot_index = _from_slot
  ON CONFLICT (vacancy_id, slot_index, shift_date) DO UPDATE
    SET start_time = EXCLUDED.start_time,
        finish_time = EXCLUDED.finish_time,
        cancelled = EXCLUDED.cancelled,
        notes = coalesce(EXCLUDED.notes, public.vacancy_shifts.notes),
        candidate_id = NULL,
        assignment_overridden = false,
        updated_at = now();

  DELETE FROM public.vacancy_assignments
   WHERE vacancy_id = _vacancy_id
     AND slot_index = _to_slot;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_clone_vacancy_slot(uuid, integer, integer) TO authenticated, service_role;