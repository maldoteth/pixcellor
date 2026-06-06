
-- 1. Add slot_index columns (default 0 for backward compatibility)
ALTER TABLE public.vacancy_shifts ADD COLUMN IF NOT EXISTS slot_index integer NOT NULL DEFAULT 0;
ALTER TABLE public.vacancy_assignments ADD COLUMN IF NOT EXISTS slot_index integer NOT NULL DEFAULT 0;

-- 2. Replace unique constraints to include slot_index
ALTER TABLE public.vacancy_shifts DROP CONSTRAINT IF EXISTS vacancy_shifts_vacancy_id_shift_date_key;
ALTER TABLE public.vacancy_shifts ADD CONSTRAINT vacancy_shifts_vacancy_slot_date_key UNIQUE (vacancy_id, slot_index, shift_date);

ALTER TABLE public.vacancy_assignments DROP CONSTRAINT IF EXISTS vacancy_assignments_vacancy_id_candidate_id_key;
ALTER TABLE public.vacancy_assignments ADD CONSTRAINT vacancy_assignments_vacancy_slot_candidate_key UNIQUE (vacancy_id, slot_index, candidate_id);

-- 3. portal_list_vacancy_shifts: drop & recreate with slot_index in return
DROP FUNCTION IF EXISTS public.portal_list_vacancy_shifts(uuid, date, date);
CREATE OR REPLACE FUNCTION public.portal_list_vacancy_shifts(_vacancy_id uuid, _from date, _to date)
RETURNS TABLE(id uuid, vacancy_id uuid, slot_index integer, shift_date date, start_time time without time zone, finish_time time without time zone, cancelled boolean, notes text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.id, s.vacancy_id, s.slot_index, s.shift_date, s.start_time, s.finish_time, s.cancelled, s.notes
  FROM public.vacancy_shifts s
  WHERE s.vacancy_id = _vacancy_id AND s.shift_date BETWEEN _from AND _to
    AND public.has_role(auth.uid(), 'admin');
$$;

-- 4. portal_upsert_vacancy_shift: add _slot param (default 0)
DROP FUNCTION IF EXISTS public.portal_upsert_vacancy_shift(uuid, date, time, time, boolean, text);
CREATE OR REPLACE FUNCTION public.portal_upsert_vacancy_shift(
  _vacancy_id uuid, _date date, _start time, _finish time,
  _cancelled boolean DEFAULT false, _notes text DEFAULT NULL, _slot integer DEFAULT 0
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.vacancy_shifts (vacancy_id, slot_index, shift_date, start_time, finish_time, cancelled, notes)
  VALUES (_vacancy_id, coalesce(_slot,0), _date, _start, _finish, coalesce(_cancelled,false), _notes)
  ON CONFLICT (vacancy_id, slot_index, shift_date) DO UPDATE
    SET start_time = EXCLUDED.start_time,
        finish_time = EXCLUDED.finish_time,
        cancelled = EXCLUDED.cancelled,
        notes = coalesce(EXCLUDED.notes, public.vacancy_shifts.notes),
        updated_at = now();
END; $$;

-- 5. portal_delete_vacancy_shift: add _slot
DROP FUNCTION IF EXISTS public.portal_delete_vacancy_shift(uuid, date);
CREATE OR REPLACE FUNCTION public.portal_delete_vacancy_shift(_vacancy_id uuid, _date date, _slot integer DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.vacancy_shifts WHERE vacancy_id = _vacancy_id AND shift_date = _date AND slot_index = coalesce(_slot,0);
END; $$;

-- 6. portal_assign_candidate_to_vacancy: add _slot (NULL = all slots up to openings)
DROP FUNCTION IF EXISTS public.portal_assign_candidate_to_vacancy(uuid, uuid, text, text);
CREATE OR REPLACE FUNCTION public.portal_assign_candidate_to_vacancy(
  _vacancy_id uuid, _candidate_id uuid, _stage text DEFAULT 'shortlisted', _notes text DEFAULT NULL, _slot integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  admin_email text;
  openings_count integer;
  s integer;
  rows jsonb := '[]'::jsonb;
  one_row public.vacancy_assignments%ROWTYPE;
BEGIN
  PERFORM public.portal_require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.vacancies WHERE id = _vacancy_id) THEN RAISE EXCEPTION 'Vacancy not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.candidates WHERE id = _candidate_id) THEN RAISE EXCEPTION 'Candidate not found'; END IF;
  SELECT lower(email) INTO admin_email FROM auth.users WHERE id = auth.uid();
  SELECT greatest(coalesce(openings,1),1) INTO openings_count FROM public.vacancies WHERE id = _vacancy_id;

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
END; $$;

-- 7. portal_list_vacancies: include slot_index in assignments
CREATE OR REPLACE FUNCTION public.portal_list_vacancies()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public.portal_require_admin();
  SELECT coalesce(jsonb_agg(row_to_json(v) ORDER BY v.created_at DESC), '[]'::jsonb) INTO result FROM (
    SELECT
      vac.*,
      jsonb_build_object('id', c.id, 'name', c.name, 'industry', c.industry, 'location', c.location) AS client,
      coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id', va.id, 'candidate_id', va.candidate_id, 'slot_index', va.slot_index, 'stage', va.stage, 'notes', va.notes, 'assigned_at', va.assigned_at,
          'candidate', jsonb_build_object('id', cand.id, 'full_name', cand.full_name, 'email', cand.email, 'phone', cand.phone, 'headline', cand.headline, 'status', cand.status)
        ) ORDER BY va.assigned_at DESC)
        FROM public.vacancy_assignments va
        JOIN public.candidates cand ON cand.id = va.candidate_id
        WHERE va.vacancy_id = vac.id
      ), '[]'::jsonb) AS assignments
    FROM public.vacancies vac
    LEFT JOIN public.contacts c ON c.id = vac.client_contact_id
    ORDER BY vac.created_at DESC
  ) v;
  RETURN result;
END; $$;

-- 8. Clone one slot to another (shifts + assignments). Used when adding an opening.
CREATE OR REPLACE FUNCTION public.portal_clone_vacancy_slot(_vacancy_id uuid, _from_slot integer, _to_slot integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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

  INSERT INTO public.vacancy_assignments (vacancy_id, slot_index, candidate_id, stage, notes)
  SELECT vacancy_id, _to_slot, candidate_id, stage, notes
  FROM public.vacancy_assignments
  WHERE vacancy_id = _vacancy_id AND slot_index = _from_slot
  ON CONFLICT (vacancy_id, slot_index, candidate_id) DO NOTHING;
END; $$;

-- 9. Delete an entire slot's shifts + assignments (used when removing an opening)
CREATE OR REPLACE FUNCTION public.portal_delete_vacancy_slot(_vacancy_id uuid, _slot integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.vacancy_shifts WHERE vacancy_id = _vacancy_id AND slot_index = _slot;
  DELETE FROM public.vacancy_assignments WHERE vacancy_id = _vacancy_id AND slot_index = _slot;
END; $$;
