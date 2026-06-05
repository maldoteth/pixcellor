
-- Enums
CREATE TYPE public.vacancy_employment_type AS ENUM ('permanent','temporary','contract','freelance','internship');
CREATE TYPE public.vacancy_arrangement AS ENUM ('onsite','hybrid','remote');
CREATE TYPE public.vacancy_status AS ENUM ('draft','open','on_hold','filled','cancelled','closed');
CREATE TYPE public.vacancy_assignment_stage AS ENUM ('shortlisted','submitted','interviewing','offer','placed','rejected','withdrawn');

-- Vacancies table
CREATE TABLE public.vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  reference text,
  description text,
  location text,
  arrangement public.vacancy_arrangement DEFAULT 'onsite',
  employment_type public.vacancy_employment_type NOT NULL DEFAULT 'permanent',
  status public.vacancy_status NOT NULL DEFAULT 'open',
  openings smallint NOT NULL DEFAULT 1,
  start_date date,
  end_date date,
  start_time time,
  finish_time time,
  schedule_days text[] DEFAULT '{}',
  schedule_notes text,
  duration_weeks integer,
  hours_per_week numeric(5,2),
  qualifications text[] DEFAULT '{}',
  required_skills text[] DEFAULT '{}',
  nice_to_have_skills text[] DEFAULT '{}',
  certifications text[] DEFAULT '{}',
  right_to_work_required boolean DEFAULT false,
  pay_min numeric(12,2),
  pay_max numeric(12,2),
  pay_currency text DEFAULT 'GBP',
  pay_period text DEFAULT 'year',
  benefits text,
  notes text,
  contact_person_id uuid REFERENCES public.contact_persons(id) ON DELETE SET NULL,
  assigned_to_user_id uuid,
  created_by_user_id uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacancies TO authenticated;
GRANT ALL ON public.vacancies TO service_role;
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage vacancies" ON public.vacancies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE INDEX vacancies_client_idx ON public.vacancies(client_contact_id);
CREATE INDEX vacancies_status_idx ON public.vacancies(status);

CREATE TRIGGER vacancies_set_updated BEFORE UPDATE ON public.vacancies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vacancy assignments (candidates assigned to a vacancy)
CREATE TABLE public.vacancy_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  stage public.vacancy_assignment_stage NOT NULL DEFAULT 'shortlisted',
  notes text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by_user_id uuid,
  assigned_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vacancy_id, candidate_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacancy_assignments TO authenticated;
GRANT ALL ON public.vacancy_assignments TO service_role;
ALTER TABLE public.vacancy_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage vacancy assignments" ON public.vacancy_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE INDEX vacancy_assignments_vacancy_idx ON public.vacancy_assignments(vacancy_id);
CREATE INDEX vacancy_assignments_candidate_idx ON public.vacancy_assignments(candidate_id);

CREATE TRIGGER vacancy_assignments_set_updated BEFORE UPDATE ON public.vacancy_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPCs
CREATE OR REPLACE FUNCTION public.portal_create_vacancy(_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_email text;
  new_row public.vacancies%ROWTYPE;
  client_id uuid := (_payload->>'client_contact_id')::uuid;
  clean_title text := nullif(trim(_payload->>'title'),'');
BEGIN
  PERFORM public.portal_require_admin();
  IF client_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = client_id) THEN
    RAISE EXCEPTION 'Select a valid client';
  END IF;
  IF clean_title IS NULL OR length(clean_title) > 160 THEN
    RAISE EXCEPTION 'Job title is required (max 160 chars)';
  END IF;
  SELECT lower(email) INTO admin_email FROM auth.users WHERE id = auth.uid() LIMIT 1;

  INSERT INTO public.vacancies (
    client_contact_id, title, reference, description, location, arrangement, employment_type, status,
    openings, start_date, end_date, start_time, finish_time, schedule_days, schedule_notes,
    duration_weeks, hours_per_week, qualifications, required_skills, nice_to_have_skills, certifications,
    right_to_work_required, pay_min, pay_max, pay_currency, pay_period, benefits, notes,
    contact_person_id, created_by_user_id, created_by_email
  ) VALUES (
    client_id,
    clean_title,
    nullif(trim(_payload->>'reference'),''),
    nullif(trim(_payload->>'description'),''),
    nullif(trim(_payload->>'location'),''),
    coalesce(nullif(_payload->>'arrangement','')::public.vacancy_arrangement,'onsite'),
    coalesce(nullif(_payload->>'employment_type','')::public.vacancy_employment_type,'permanent'),
    coalesce(nullif(_payload->>'status','')::public.vacancy_status,'open'),
    coalesce((_payload->>'openings')::smallint,1),
    nullif(_payload->>'start_date','')::date,
    nullif(_payload->>'end_date','')::date,
    nullif(_payload->>'start_time','')::time,
    nullif(_payload->>'finish_time','')::time,
    CASE WHEN _payload ? 'schedule_days' THEN ARRAY(SELECT jsonb_array_elements_text(_payload->'schedule_days')) ELSE '{}'::text[] END,
    nullif(trim(_payload->>'schedule_notes'),''),
    nullif(_payload->>'duration_weeks','')::int,
    nullif(_payload->>'hours_per_week','')::numeric,
    CASE WHEN _payload ? 'qualifications' THEN ARRAY(SELECT jsonb_array_elements_text(_payload->'qualifications')) ELSE '{}'::text[] END,
    CASE WHEN _payload ? 'required_skills' THEN ARRAY(SELECT jsonb_array_elements_text(_payload->'required_skills')) ELSE '{}'::text[] END,
    CASE WHEN _payload ? 'nice_to_have_skills' THEN ARRAY(SELECT jsonb_array_elements_text(_payload->'nice_to_have_skills')) ELSE '{}'::text[] END,
    CASE WHEN _payload ? 'certifications' THEN ARRAY(SELECT jsonb_array_elements_text(_payload->'certifications')) ELSE '{}'::text[] END,
    coalesce((_payload->>'right_to_work_required')::boolean,false),
    nullif(_payload->>'pay_min','')::numeric,
    nullif(_payload->>'pay_max','')::numeric,
    coalesce(nullif(_payload->>'pay_currency',''),'GBP'),
    coalesce(nullif(_payload->>'pay_period',''),'year'),
    nullif(trim(_payload->>'benefits'),''),
    nullif(trim(_payload->>'notes'),''),
    nullif(_payload->>'contact_person_id','')::uuid,
    auth.uid(), admin_email
  ) RETURNING * INTO new_row;
  RETURN to_jsonb(new_row);
END; $$;

CREATE OR REPLACE FUNCTION public.portal_update_vacancy(_id uuid, _patch jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.portal_require_admin();
  UPDATE public.vacancies SET
    title = coalesce(nullif(trim(_patch->>'title'),''), title),
    reference = coalesce(_patch->>'reference', reference),
    description = coalesce(_patch->>'description', description),
    location = coalesce(_patch->>'location', location),
    arrangement = coalesce(nullif(_patch->>'arrangement','')::public.vacancy_arrangement, arrangement),
    employment_type = coalesce(nullif(_patch->>'employment_type','')::public.vacancy_employment_type, employment_type),
    status = coalesce(nullif(_patch->>'status','')::public.vacancy_status, status),
    openings = coalesce((_patch->>'openings')::smallint, openings),
    start_date = coalesce(nullif(_patch->>'start_date','')::date, start_date),
    end_date = coalesce(nullif(_patch->>'end_date','')::date, end_date),
    start_time = coalesce(nullif(_patch->>'start_time','')::time, start_time),
    finish_time = coalesce(nullif(_patch->>'finish_time','')::time, finish_time),
    schedule_days = CASE WHEN _patch ? 'schedule_days' THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'schedule_days')) ELSE schedule_days END,
    schedule_notes = coalesce(_patch->>'schedule_notes', schedule_notes),
    duration_weeks = coalesce((_patch->>'duration_weeks')::int, duration_weeks),
    hours_per_week = coalesce((_patch->>'hours_per_week')::numeric, hours_per_week),
    qualifications = CASE WHEN _patch ? 'qualifications' THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'qualifications')) ELSE qualifications END,
    required_skills = CASE WHEN _patch ? 'required_skills' THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'required_skills')) ELSE required_skills END,
    nice_to_have_skills = CASE WHEN _patch ? 'nice_to_have_skills' THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'nice_to_have_skills')) ELSE nice_to_have_skills END,
    certifications = CASE WHEN _patch ? 'certifications' THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'certifications')) ELSE certifications END,
    right_to_work_required = coalesce((_patch->>'right_to_work_required')::boolean, right_to_work_required),
    pay_min = coalesce((_patch->>'pay_min')::numeric, pay_min),
    pay_max = coalesce((_patch->>'pay_max')::numeric, pay_max),
    pay_currency = coalesce(_patch->>'pay_currency', pay_currency),
    pay_period = coalesce(_patch->>'pay_period', pay_period),
    benefits = coalesce(_patch->>'benefits', benefits),
    notes = coalesce(_patch->>'notes', notes),
    contact_person_id = coalesce(nullif(_patch->>'contact_person_id','')::uuid, contact_person_id),
    updated_at = now()
  WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vacancy not found'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.portal_delete_vacancy(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.portal_require_admin();
  DELETE FROM public.vacancies WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.portal_assign_candidate_to_vacancy(_vacancy_id uuid, _candidate_id uuid, _stage text DEFAULT 'shortlisted', _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_email text; new_row public.vacancy_assignments%ROWTYPE;
BEGIN
  PERFORM public.portal_require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.vacancies WHERE id = _vacancy_id) THEN
    RAISE EXCEPTION 'Vacancy not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.candidates WHERE id = _candidate_id) THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;
  SELECT lower(email) INTO admin_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.vacancy_assignments (vacancy_id, candidate_id, stage, notes, assigned_by_user_id, assigned_by_email)
  VALUES (_vacancy_id, _candidate_id, coalesce(nullif(_stage,'')::public.vacancy_assignment_stage,'shortlisted'), nullif(trim(coalesce(_notes,'')),''), auth.uid(), admin_email)
  ON CONFLICT (vacancy_id, candidate_id) DO UPDATE
    SET stage = EXCLUDED.stage, notes = coalesce(EXCLUDED.notes, public.vacancy_assignments.notes), updated_at = now()
  RETURNING * INTO new_row;
  RETURN to_jsonb(new_row);
END; $$;

CREATE OR REPLACE FUNCTION public.portal_unassign_candidate(_assignment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.portal_require_admin();
  DELETE FROM public.vacancy_assignments WHERE id = _assignment_id;
END; $$;

CREATE OR REPLACE FUNCTION public.portal_update_assignment_stage(_assignment_id uuid, _stage text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.portal_require_admin();
  UPDATE public.vacancy_assignments
    SET stage = _stage::public.vacancy_assignment_stage, updated_at = now()
    WHERE id = _assignment_id;
END; $$;

CREATE OR REPLACE FUNCTION public.portal_list_vacancies()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public.portal_require_admin();
  SELECT coalesce(jsonb_agg(row_to_json(v) ORDER BY v.created_at DESC), '[]'::jsonb) INTO result FROM (
    SELECT
      vac.*,
      jsonb_build_object('id', c.id, 'name', c.name, 'industry', c.industry, 'location', c.location) AS client,
      coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id', va.id, 'candidate_id', va.candidate_id, 'stage', va.stage, 'notes', va.notes, 'assigned_at', va.assigned_at,
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
