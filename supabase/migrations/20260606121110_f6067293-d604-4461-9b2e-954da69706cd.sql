CREATE OR REPLACE FUNCTION public.recalc_vacancy_status(_vacancy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_openings int;
  v_current_status text;
  v_assigned_slots int;
  v_new_status text;
BEGIN
  SELECT greatest(coalesce(openings, 1), 1), status::text INTO v_openings, v_current_status
  FROM public.vacancies
  WHERE id = _vacancy_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_current_status NOT IN ('open', 'filled') THEN
    RETURN;
  END IF;

  SELECT count(DISTINCT slot_index) INTO v_assigned_slots
  FROM public.vacancy_assignments
  WHERE vacancy_id = _vacancy_id
    AND slot_index >= 0
    AND slot_index < v_openings
    AND stage IN ('shortlisted', 'submitted', 'interviewing', 'offer', 'placed');

  v_new_status := CASE WHEN v_assigned_slots >= v_openings THEN 'filled' ELSE 'open' END;

  IF v_new_status <> v_current_status THEN
    UPDATE public.vacancies
    SET status = v_new_status::public.vacancy_status,
        updated_at = now()
    WHERE id = _vacancy_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_vacancy_status_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_vacancy_status(OLD.vacancy_id);
    RETURN OLD;
  END IF;

  PERFORM public.recalc_vacancy_status(NEW.vacancy_id);

  IF TG_OP = 'UPDATE' AND OLD.vacancy_id IS DISTINCT FROM NEW.vacancy_id THEN
    PERFORM public.recalc_vacancy_status(OLD.vacancy_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_vacancy_status_openings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s int;
BEGIN
  IF NEW.openings IS DISTINCT FROM OLD.openings THEN
    IF greatest(coalesce(NEW.openings, 1), 1) > greatest(coalesce(OLD.openings, 1), 1) THEN
      FOR s IN greatest(coalesce(OLD.openings, 1), 1)..(greatest(coalesce(NEW.openings, 1), 1) - 1) LOOP
        INSERT INTO public.vacancy_shifts (vacancy_id, slot_index, shift_date, start_time, finish_time, cancelled, notes)
        SELECT vacancy_id, s, shift_date, start_time, finish_time, cancelled, notes
        FROM public.vacancy_shifts
        WHERE vacancy_id = NEW.id AND slot_index = 0
        ON CONFLICT (vacancy_id, slot_index, shift_date) DO NOTHING;

        INSERT INTO public.vacancy_assignments (vacancy_id, slot_index, candidate_id, stage, notes, assigned_by_user_id, assigned_by_email)
        SELECT vacancy_id, s, candidate_id, stage, notes, assigned_by_user_id, assigned_by_email
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

DROP TRIGGER IF EXISTS recalc_vacancy_status_assignments ON public.vacancy_assignments;
CREATE TRIGGER recalc_vacancy_status_assignments
AFTER INSERT OR UPDATE OR DELETE ON public.vacancy_assignments
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalc_vacancy_status_assignments();

DROP TRIGGER IF EXISTS recalc_vacancy_status_openings ON public.vacancies;
CREATE TRIGGER recalc_vacancy_status_openings
AFTER UPDATE OF openings ON public.vacancies
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalc_vacancy_status_openings();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vacancies;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vacancy_assignments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vacancy_shifts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;