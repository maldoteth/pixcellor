
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS candidates_user_id_idx ON public.candidates(user_id);

-- Link the current logged-in user to their candidate row by matching email.
CREATE OR REPLACE FUNCTION public.candidate_link_self()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_candidate_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN RETURN NULL; END IF;

  UPDATE public.candidates
     SET user_id = v_uid, updated_at = now()
   WHERE user_id IS NULL
     AND lower(email) = lower(v_email)
   RETURNING id INTO v_candidate_id;

  IF v_candidate_id IS NULL THEN
    SELECT id INTO v_candidate_id
      FROM public.candidates
     WHERE user_id = v_uid
     LIMIT 1;
  END IF;

  RETURN v_candidate_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.candidate_link_self() TO authenticated;

-- Return the logged-in candidate's schedule: assignments + vacancy + client name.
CREATE OR REPLACE FUNCTION public.candidate_my_schedule()
RETURNS TABLE (
  assignment_id uuid,
  stage vacancy_assignment_stage,
  vacancy_id uuid,
  title text,
  reference text,
  description text,
  location text,
  arrangement vacancy_arrangement,
  employment_type vacancy_employment_type,
  status vacancy_status,
  start_date date,
  end_date date,
  start_time time,
  finish_time time,
  schedule_days text[],
  schedule_notes text,
  hours_per_week numeric,
  pay_min numeric,
  pay_max numeric,
  pay_currency text,
  pay_period text,
  benefits text,
  client_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id, a.stage,
    v.id, v.title, v.reference, v.description, v.location,
    v.arrangement, v.employment_type, v.status,
    v.start_date, v.end_date, v.start_time, v.finish_time,
    v.schedule_days, v.schedule_notes, v.hours_per_week,
    v.pay_min, v.pay_max, v.pay_currency, v.pay_period, v.benefits,
    c.name
  FROM public.vacancy_assignments a
  JOIN public.vacancies v ON v.id = a.vacancy_id
  JOIN public.candidates cd ON cd.id = a.candidate_id
  LEFT JOIN public.contacts c ON c.id = v.client_contact_id
  WHERE cd.user_id = auth.uid()
  ORDER BY v.start_date NULLS LAST, v.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.candidate_my_schedule() TO authenticated;
