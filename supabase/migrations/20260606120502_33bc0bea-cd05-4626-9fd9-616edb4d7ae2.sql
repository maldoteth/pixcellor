
CREATE OR REPLACE FUNCTION public.recalc_vacancy_status(_vacancy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_openings int;
  v_current_status text;
  v_assigned_slots int;
  v_new_status text;
BEGIN
  SELECT openings, status INTO v_openings, v_current_status
  FROM public.vacancies WHERE id = _vacancy_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Only auto-toggle between open and filled. Leave other statuses (paused, closed, draft) untouched.
  IF v_current_status NOT IN ('open','filled') THEN RETURN; END IF;

  SELECT COUNT(DISTINCT slot_index) INTO v_assigned_slots
  FROM public.vacancy_assignments
  WHERE vacancy_id = _vacancy_id
    AND slot_index >= 0
    AND slot_index < COALESCE(v_openings, 1);

  IF v_assigned_slots >= COALESCE(v_openings, 1) THEN
    v_new_status := 'filled';
  ELSE
    v_new_status := 'open';
  END IF;

  IF v_new_status <> v_current_status THEN
    UPDATE public.vacancies SET status = v_new_status, updated_at = now() WHERE id = _vacancy_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_vacancy_status_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_vacancy_status(OLD.vacancy_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_vacancy_status(NEW.vacancy_id);
    IF TG_OP = 'UPDATE' AND OLD.vacancy_id <> NEW.vacancy_id THEN
      PERFORM public.recalc_vacancy_status(OLD.vacancy_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_vacancy_assignments_recalc ON public.vacancy_assignments;
CREATE TRIGGER trg_vacancy_assignments_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.vacancy_assignments
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_vacancy_status_assignments();

CREATE OR REPLACE FUNCTION public.trg_recalc_vacancy_status_openings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.openings IS DISTINCT FROM OLD.openings THEN
    PERFORM public.recalc_vacancy_status(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vacancies_openings_recalc ON public.vacancies;
CREATE TRIGGER trg_vacancies_openings_recalc
AFTER UPDATE OF openings ON public.vacancies
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_vacancy_status_openings();

-- Backfill once
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.vacancies WHERE status IN ('open','filled') LOOP
    PERFORM public.recalc_vacancy_status(r.id);
  END LOOP;
END $$;
