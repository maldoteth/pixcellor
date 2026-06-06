
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS is_open_to_work boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.portal_open_vacancies(_search text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  title text,
  location text,
  arrangement vacancy_arrangement,
  employment_type vacancy_employment_type,
  start_date date,
  end_date date,
  pay_min numeric,
  pay_max numeric,
  pay_currency text,
  pay_period text,
  openings smallint,
  required_skills text[],
  description text,
  client_name text,
  already_applied boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) AS email
  ),
  my_cand AS (
    SELECT id FROM public.candidates WHERE lower(email) = (SELECT email FROM me) LIMIT 1
  )
  SELECT
    v.id, v.title, v.location, v.arrangement, v.employment_type,
    v.start_date, v.end_date, v.pay_min, v.pay_max, v.pay_currency, v.pay_period,
    v.openings, v.required_skills, v.description,
    c.name AS client_name,
    EXISTS (
      SELECT 1 FROM public.candidate_applications a
      WHERE a.candidate_id = (SELECT id FROM my_cand)
        AND a.role_title = v.title
        AND a.client_contact_id = v.client_contact_id
    ) AS already_applied
  FROM public.vacancies v
  LEFT JOIN public.contacts c ON c.id = v.client_contact_id
  WHERE v.status = 'open'
    AND (
      _search IS NULL OR _search = '' OR
      v.title ILIKE '%' || _search || '%' OR
      v.location ILIKE '%' || _search || '%' OR
      v.description ILIKE '%' || _search || '%' OR
      c.name ILIKE '%' || _search || '%' OR
      EXISTS (SELECT 1 FROM unnest(v.required_skills) s WHERE s ILIKE '%' || _search || '%')
    )
  ORDER BY v.start_date NULLS LAST, v.created_at DESC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.portal_open_vacancies(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.candidate_express_interest(_vacancy_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := lower(coalesce((auth.jwt() ->> 'email'), ''));
  v_cand_id uuid;
  v_vac record;
  v_app_id uuid;
BEGIN
  IF v_email = '' THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id INTO v_cand_id FROM public.candidates WHERE lower(email) = v_email LIMIT 1;
  IF v_cand_id IS NULL THEN RAISE EXCEPTION 'no_candidate_profile'; END IF;
  SELECT * INTO v_vac FROM public.vacancies WHERE id = _vacancy_id;
  IF v_vac IS NULL THEN RAISE EXCEPTION 'vacancy_not_found'; END IF;

  SELECT id INTO v_app_id FROM public.candidate_applications
   WHERE candidate_id = v_cand_id
     AND role_title = v_vac.title
     AND client_contact_id = v_vac.client_contact_id
   LIMIT 1;
  IF v_app_id IS NOT NULL THEN
    RETURN jsonb_build_object('status','already_applied','application_id',v_app_id);
  END IF;

  INSERT INTO public.candidate_applications (candidate_id, role_title, client_contact_id, stage, notes)
  VALUES (v_cand_id, v_vac.title, v_vac.client_contact_id, 'submitted', 'Self-applied from candidate portal')
  RETURNING id INTO v_app_id;

  RETURN jsonb_build_object('status','submitted','application_id',v_app_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.candidate_express_interest(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.candidate_set_availability(_date date, _open boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := lower(coalesce((auth.jwt() ->> 'email'), ''));
  v_cand_id uuid;
BEGIN
  IF v_email = '' THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.candidates
     SET availability_date = _date,
         is_open_to_work = COALESCE(_open, is_open_to_work),
         updated_at = now()
   WHERE lower(email) = v_email
   RETURNING id INTO v_cand_id;
  IF v_cand_id IS NULL THEN RAISE EXCEPTION 'no_candidate_profile'; END IF;
  RETURN jsonb_build_object('status','ok','candidate_id',v_cand_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.candidate_set_availability(date, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.candidate_get_self()
RETURNS TABLE (id uuid, full_name text, email text, availability_date date, is_open_to_work boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, full_name, email, availability_date, is_open_to_work
  FROM public.candidates
  WHERE lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.candidate_get_self() TO authenticated;
