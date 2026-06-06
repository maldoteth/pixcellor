
CREATE OR REPLACE FUNCTION public.trg_recalc_vacancy_status_openings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s int;
BEGIN
  IF NEW.openings IS DISTINCT FROM OLD.openings THEN
    IF COALESCE(NEW.openings,1) > COALESCE(OLD.openings,1) THEN
      FOR s IN COALESCE(OLD.openings,1)..(COALESCE(NEW.openings,1) - 1) LOOP
        INSERT INTO public.vacancy_shifts (vacancy_id, slot_index, shift_date, start_time, finish_time, cancelled, notes)
        SELECT vacancy_id, s, shift_date, start_time, finish_time, cancelled, notes
        FROM public.vacancy_shifts
        WHERE vacancy_id = NEW.id AND slot_index = 0
        ON CONFLICT (vacancy_id, slot_index, shift_date) DO NOTHING;

        INSERT INTO public.vacancy_assignments (vacancy_id, slot_index, candidate_id, stage, notes)
        SELECT vacancy_id, s, candidate_id, stage, notes
        FROM public.vacancy_assignments
        WHERE vacancy_id = NEW.id AND slot_index = 0
        ON CONFLICT (vacancy_id, slot_index, candidate_id) DO NOTHING;
      END LOOP;
    END IF;
    PERFORM public.recalc_vacancy_status(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Re-run status calc for all open/filled vacancies to reflect any existing data
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.vacancies WHERE status IN ('open','filled') LOOP
    PERFORM public.recalc_vacancy_status(r.id);
  END LOOP;
END $$;
