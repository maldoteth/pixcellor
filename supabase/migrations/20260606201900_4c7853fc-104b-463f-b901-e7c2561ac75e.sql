
CREATE OR REPLACE FUNCTION public.portal_my_vacancies_full()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := lower(coalesce((auth.jwt() ->> 'email'), ''));
  v_cand_ids uuid[];
  v_client_contact_ids uuid[];
  v_vac_ids uuid[];
  v_result jsonb;
BEGIN
  IF v_email = '' THEN RETURN '[]'::jsonb; END IF;

  SELECT array_agg(id) INTO v_cand_ids FROM public.candidates WHERE lower(email) = v_email;

  SELECT array_agg(DISTINCT cid) INTO v_client_contact_ids FROM (
    SELECT id AS cid FROM public.contacts WHERE lower(email) = v_email
    UNION
    SELECT contact_id AS cid FROM public.contact_persons WHERE lower(email) = v_email
  ) sub;

  SELECT array_agg(DISTINCT vid) INTO v_vac_ids FROM (
    SELECT va.vacancy_id AS vid FROM public.vacancy_assignments va
      WHERE v_cand_ids IS NOT NULL AND va.candidate_id = ANY(v_cand_ids)
    UNION
    SELECT vi.vacancy_id AS vid FROM public.vacancy_invitations vi
      WHERE v_cand_ids IS NOT NULL AND vi.candidate_id = ANY(v_cand_ids)
    UNION
    SELECT id AS vid FROM public.vacancies
      WHERE v_client_contact_ids IS NOT NULL AND client_contact_id = ANY(v_client_contact_ids)
  ) sub;

  IF v_vac_ids IS NULL OR array_length(v_vac_ids, 1) = 0 THEN RETURN '[]'::jsonb; END IF;

  SELECT coalesce(jsonb_agg(row_to_json(v) ORDER BY v.created_at DESC), '[]'::jsonb) INTO v_result FROM (
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
    WHERE vac.id = ANY(v_vac_ids)
    ORDER BY vac.created_at DESC
  ) v;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_my_vacancies_full() TO authenticated;
