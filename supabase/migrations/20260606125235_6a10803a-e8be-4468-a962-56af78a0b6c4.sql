CREATE OR REPLACE FUNCTION public.portal_materialize_vacancy_shifts(_vacancy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v record;
  d date;
  s integer;
  dow text;
  has_days boolean;
BEGIN
  SELECT id, openings, start_date, end_date, start_time, finish_time, schedule_days
    INTO v
    FROM public.vacancies
   WHERE id = _vacancy_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v.start_date IS NULL OR v.end_date IS NULL OR (v.start_time IS NULL AND v.finish_time IS NULL) THEN
    RETURN;
  END IF;

  has_days := v.schedule_days IS NOT NULL AND array_length(v.schedule_days, 1) IS NOT NULL;

  FOR s IN 0..(greatest(coalesce(v.openings, 1), 1) - 1) LOOP
    d := v.start_date;
    WHILE d <= v.end_date LOOP
      dow := lower(to_char(d, 'Dy'));
      IF NOT has_days OR EXISTS (SELECT 1 FROM unnest(v.schedule_days) day_name WHERE lower(left(day_name, 3)) = dow) THEN
        INSERT INTO public.vacancy_shifts (vacancy_id, slot_index, shift_date, start_time, finish_time, cancelled, notes)
        VALUES (v.id, s, d, v.start_time, v.finish_time, false, NULL)
        ON CONFLICT (vacancy_id, slot_index, shift_date) DO UPDATE
          SET start_time = coalesce(public.vacancy_shifts.start_time, EXCLUDED.start_time),
              finish_time = coalesce(public.vacancy_shifts.finish_time, EXCLUDED.finish_time),
              cancelled = false,
              updated_at = now()
        WHERE public.vacancy_shifts.cancelled = false;
      END IF;
      d := d + 1;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_materialize_vacancy_shifts(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.portal_create_vacancy(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    coalesce(nullif(_payload->>'paye_rate_percent','')::numeric, 21)
  ) RETURNING * INTO new_row;

  PERFORM public.portal_materialize_vacancy_shifts(new_row.id);
  RETURN to_jsonb(new_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_update_vacancy(_id uuid, _patch jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  IF _patch ? 'openings' OR _patch ? 'start_date' OR _patch ? 'end_date' OR _patch ? 'start_time' OR _patch ? 'finish_time' OR _patch ? 'schedule_days' THEN
    PERFORM public.portal_materialize_vacancy_shifts(_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_set_shift_candidate(_vacancy_id uuid, _slot integer, _date date, _candidate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start time; v_finish time;
  s_start time; s_finish time;
  conflict_title text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT vs.start_time, vs.finish_time INTO s_start, s_finish
    FROM public.vacancy_shifts vs
   WHERE vs.vacancy_id = _vacancy_id AND vs.slot_index = coalesce(_slot,0) AND vs.shift_date = _date;

  IF s_start IS NULL OR s_finish IS NULL THEN
    SELECT start_time, finish_time INTO v_start, v_finish FROM public.vacancies WHERE id = _vacancy_id;
    s_start := coalesce(s_start, v_start);
    s_finish := coalesce(s_finish, v_finish);
  END IF;

  IF _candidate_id IS NOT NULL AND s_start IS NOT NULL AND s_finish IS NOT NULL THEN
    SELECT v2.title INTO conflict_title
      FROM public.vacancy_shifts vs2
      JOIN public.vacancies v2 ON v2.id = vs2.vacancy_id
     WHERE vs2.shift_date = _date
       AND vs2.candidate_id = _candidate_id
       AND vs2.cancelled = false
       AND NOT (vs2.vacancy_id = _vacancy_id AND vs2.slot_index = coalesce(_slot,0))
       AND public._times_overlap(s_start, s_finish, coalesce(vs2.start_time, v2.start_time), coalesce(vs2.finish_time, v2.finish_time))
     LIMIT 1;

    IF conflict_title IS NOT NULL THEN
      RAISE EXCEPTION 'Candidate already booked on % for "%"', _date, conflict_title;
    END IF;

    SELECT v3.title INTO conflict_title
      FROM public.vacancy_assignments va3
      JOIN public.vacancies v3 ON v3.id = va3.vacancy_id
     WHERE va3.candidate_id = _candidate_id
       AND va3.vacancy_id <> _vacancy_id
       AND va3.stage IN ('shortlisted','submitted','interviewing','offer','placed')
       AND coalesce(v3.start_date, _date) <= _date
       AND coalesce(v3.end_date, _date) >= _date
       AND (
         v3.schedule_days IS NULL OR array_length(v3.schedule_days,1) IS NULL
         OR EXISTS (
           SELECT 1 FROM unnest(v3.schedule_days) d
           WHERE lower(left(d,3)) = lower(to_char(_date, 'Dy'))
         )
       )
       AND public._times_overlap(s_start, s_finish, v3.start_time, v3.finish_time)
       AND NOT EXISTS (
         SELECT 1 FROM public.vacancy_shifts vs4
          WHERE vs4.vacancy_id = va3.vacancy_id
            AND vs4.slot_index = va3.slot_index
            AND vs4.shift_date = _date
            AND (vs4.cancelled = true OR (vs4.assignment_overridden = true AND coalesce(vs4.candidate_id::text,'') <> _candidate_id::text))
       )
     LIMIT 1;

    IF conflict_title IS NOT NULL THEN
      RAISE EXCEPTION 'Candidate already booked on % for "%"', _date, conflict_title;
    END IF;
  END IF;

  INSERT INTO public.vacancy_shifts (vacancy_id, slot_index, shift_date, start_time, finish_time, cancelled, candidate_id, assignment_overridden)
  VALUES (_vacancy_id, coalesce(_slot,0), _date, s_start, s_finish, false, _candidate_id, true)
  ON CONFLICT (vacancy_id, slot_index, shift_date) DO UPDATE
    SET start_time = coalesce(public.vacancy_shifts.start_time, EXCLUDED.start_time),
        finish_time = coalesce(public.vacancy_shifts.finish_time, EXCLUDED.finish_time),
        cancelled = false,
        candidate_id = EXCLUDED.candidate_id,
        assignment_overridden = true,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_create_vacancy(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_update_vacancy(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_set_shift_candidate(uuid, integer, date, uuid) TO authenticated, service_role;