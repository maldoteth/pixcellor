
ALTER TABLE public.vacancies
  ADD COLUMN IF NOT EXISTS charge_rate numeric,
  ADD COLUMN IF NOT EXISTS paye_rate_percent numeric NOT NULL DEFAULT 17;

-- Recreate create function with charge_rate + paye_rate_percent
CREATE OR REPLACE FUNCTION public.portal_create_vacancy(_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    contact_person_id, created_by_user_id, created_by_email,
    latitude, longitude, geocoded_at, geocode_source,
    charge_rate, paye_rate_percent
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
    auth.uid(), admin_email,
    nullif(_payload->>'latitude','')::double precision,
    nullif(_payload->>'longitude','')::double precision,
    CASE WHEN _payload ? 'latitude' AND nullif(_payload->>'latitude','') IS NOT NULL THEN now() ELSE NULL END,
    CASE WHEN _payload ? 'latitude' AND nullif(_payload->>'latitude','') IS NOT NULL THEN 'google_places' ELSE NULL END,
    nullif(_payload->>'charge_rate','')::numeric,
    coalesce(nullif(_payload->>'paye_rate_percent','')::numeric, 17)
  ) RETURNING * INTO new_row;
  RETURN to_jsonb(new_row);
END; $function$;

-- Update function with new fields
CREATE OR REPLACE FUNCTION public.portal_update_vacancy(_id uuid, _patch jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    charge_rate = CASE WHEN _patch ? 'charge_rate' THEN nullif(_patch->>'charge_rate','')::numeric ELSE charge_rate END,
    paye_rate_percent = CASE WHEN _patch ? 'paye_rate_percent' THEN coalesce(nullif(_patch->>'paye_rate_percent','')::numeric, paye_rate_percent) ELSE paye_rate_percent END,
    updated_at = now()
  WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vacancy not found'; END IF;
END; $function$;
