CREATE OR REPLACE FUNCTION public.portal_rank_candidates_for_vacancy(_vacancy_id uuid, _limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v public.vacancies%ROWTYPE; result jsonb;
BEGIN
  PERFORM public.portal_require_admin();
  SELECT * INTO v FROM public.vacancies WHERE id = _vacancy_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vacancy not found'; END IF;
  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.score DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT c.id, c.full_name, c.email, c.phone, c.headline, c.location, c.skills, c.status,
           c.right_to_work, c.desired_work_type, c.desired_arrangement, c.years_experience,
           c.latitude, c.longitude,
           public.haversine_km(c.latitude, c.longitude, v.latitude, v.longitude) AS distance_km,
      ((SELECT count(*) FROM unnest(coalesce(c.skills,'{}')) s WHERE s = ANY(coalesce(v.required_skills,'{}')))::int * 5
        + (SELECT count(*) FROM unnest(coalesce(c.skills,'{}')) s WHERE s = ANY(coalesce(v.nice_to_have_skills,'{}')))::int * 2
        + CASE WHEN v.location IS NOT NULL AND lower(coalesce(c.location,'')) LIKE '%'||lower(v.location)||'%' THEN 3 ELSE 0 END
        + (SELECT count(*) FROM unnest(coalesce(c.preferred_locations,'{}')) p WHERE v.location IS NOT NULL AND lower(v.location) LIKE '%'||lower(p)||'%')::int * 2
        + CASE WHEN v.right_to_work_required AND c.right_to_work IN ('uk_citizen','settled') THEN 2 WHEN v.right_to_work_required AND c.right_to_work = 'visa_required' THEN -2 ELSE 0 END
        + CASE WHEN v.arrangement::text = c.desired_arrangement::text THEN 2 ELSE 0 END
        + CASE WHEN c.latitude IS NULL OR v.latitude IS NULL THEN 0
            WHEN public.haversine_km(c.latitude, c.longitude, v.latitude, v.longitude) <= 10 THEN 8
            WHEN public.haversine_km(c.latitude, c.longitude, v.latitude, v.longitude) <= 25 THEN 5
            WHEN public.haversine_km(c.latitude, c.longitude, v.latitude, v.longitude) <= 50 THEN 3
            WHEN public.haversine_km(c.latitude, c.longitude, v.latitude, v.longitude) <= 100 THEN 1
            ELSE -2 END
      ) AS score
    FROM public.candidates c
    WHERE c.status NOT IN ('archived','rejected','placed')
    ORDER BY score DESC, c.updated_at DESC
    LIMIT GREATEST(_limit, 1)
  ) t WHERE t.score > 0;
  RETURN coalesce(result,'[]'::jsonb);
END; $function$;