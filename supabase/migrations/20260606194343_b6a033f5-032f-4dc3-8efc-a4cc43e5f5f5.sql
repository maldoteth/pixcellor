
-- 1. Helper: which vacancies does the current auth user have access to (as candidate or client)
CREATE OR REPLACE FUNCTION public.portal_my_vacancy_ids()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_cand uuid[];
  v_client uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('as_candidate', '[]'::jsonb, 'as_client', '[]'::jsonb, 'email', null);
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT coalesce(array_agg(DISTINCT a.vacancy_id), ARRAY[]::uuid[]) INTO v_cand
  FROM public.vacancy_assignments a
  JOIN public.candidates c ON c.id = a.candidate_id
  WHERE c.user_id = v_uid OR (v_email IS NOT NULL AND lower(c.email) = lower(v_email));

  SELECT coalesce(array_agg(DISTINCT v.id), ARRAY[]::uuid[]) INTO v_client
  FROM public.vacancies v
  JOIN public.contacts ct ON ct.id = v.client_contact_id
  LEFT JOIN public.contact_persons cp ON cp.contact_id = ct.id
  WHERE v_email IS NOT NULL AND (
        lower(ct.email) = lower(v_email)
     OR lower(cp.email) = lower(v_email)
  );

  RETURN jsonb_build_object(
    'as_candidate', to_jsonb(v_cand),
    'as_client', to_jsonb(v_client),
    'email', v_email
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.portal_my_vacancy_ids() TO authenticated;

-- 2. Shifts for vacancies the current user can see (candidate OR client view)
CREATE OR REPLACE FUNCTION public.portal_my_shifts(_from date, _to date)
RETURNS TABLE(
  id uuid, vacancy_id uuid, slot_index integer, shift_date date,
  start_time time, finish_time time, cancelled boolean, notes text,
  candidate_id uuid, assignment_overridden boolean, candidate_name text,
  vacancy_title text, client_name text, viewer_role text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids jsonb := public.portal_my_vacancy_ids();
  cand_ids uuid[];
  client_ids uuid[];
  all_ids uuid[];
BEGIN
  SELECT ARRAY(SELECT jsonb_array_elements_text(ids->'as_candidate')::uuid) INTO cand_ids;
  SELECT ARRAY(SELECT jsonb_array_elements_text(ids->'as_client')::uuid) INTO client_ids;
  all_ids := cand_ids || client_ids;
  IF array_length(all_ids, 1) IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT s.id, s.vacancy_id, s.slot_index, s.shift_date, s.start_time, s.finish_time,
         s.cancelled, s.notes, s.candidate_id, s.assignment_overridden,
         c.full_name, v.title, ct.name,
         CASE WHEN s.vacancy_id = ANY(client_ids) THEN 'client' ELSE 'candidate' END
  FROM public.vacancy_shifts s
  JOIN public.vacancies v ON v.id = s.vacancy_id
  LEFT JOIN public.candidates c ON c.id = s.candidate_id
  LEFT JOIN public.contacts ct ON ct.id = v.client_contact_id
  WHERE s.vacancy_id = ANY(all_ids)
    AND s.shift_date BETWEEN _from AND _to;
END; $$;

GRANT EXECUTE ON FUNCTION public.portal_my_shifts(date, date) TO authenticated;

-- 3. Vacancies + assignments for the current user
CREATE OR REPLACE FUNCTION public.portal_my_vacancies()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids jsonb := public.portal_my_vacancy_ids();
  cand_ids uuid[];
  client_ids uuid[];
  all_ids uuid[];
  result jsonb;
BEGIN
  SELECT ARRAY(SELECT jsonb_array_elements_text(ids->'as_candidate')::uuid) INTO cand_ids;
  SELECT ARRAY(SELECT jsonb_array_elements_text(ids->'as_client')::uuid) INTO client_ids;
  all_ids := cand_ids || client_ids;
  IF array_length(all_ids, 1) IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT coalesce(jsonb_agg(row_to_json(v) ORDER BY v.created_at DESC), '[]'::jsonb) INTO result FROM (
    SELECT vac.*,
      jsonb_build_object('id', c.id, 'name', c.name, 'industry', c.industry, 'location', c.location) AS client,
      CASE WHEN vac.id = ANY(client_ids) THEN 'client' ELSE 'candidate' END AS viewer_role,
      coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id', va.id, 'candidate_id', va.candidate_id, 'slot_index', va.slot_index, 'stage', va.stage,
          'candidate', jsonb_build_object('id', cand.id, 'full_name', cand.full_name, 'status', cand.status)
        ) ORDER BY va.assigned_at DESC)
        FROM public.vacancy_assignments va
        JOIN public.candidates cand ON cand.id = va.candidate_id
        WHERE va.vacancy_id = vac.id
      ), '[]'::jsonb) AS assignments
    FROM public.vacancies vac
    LEFT JOIN public.contacts c ON c.id = vac.client_contact_id
    WHERE vac.id = ANY(all_ids)
    ORDER BY vac.created_at DESC
  ) v;
  RETURN result;
END; $$;

GRANT EXECUTE ON FUNCTION public.portal_my_vacancies() TO authenticated;

-- 4. List invitations sent to the current candidate
CREATE OR REPLACE FUNCTION public.portal_my_invitations()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  result jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT coalesce(jsonb_agg(row_to_json(r) ORDER BY r.sent_at DESC), '[]'::jsonb) INTO result FROM (
    SELECT i.id, i.vacancy_id, i.status, i.custom_message, i.sent_at, i.expires_at, i.responded_at,
           v.title AS vacancy_title, v.location, v.start_date, v.end_date, v.start_time, v.finish_time,
           ct.name AS client_name
    FROM public.vacancy_invitations i
    JOIN public.candidates c ON c.id = i.candidate_id
    JOIN public.vacancies v ON v.id = i.vacancy_id
    LEFT JOIN public.contacts ct ON ct.id = v.client_contact_id
    WHERE c.user_id = v_uid OR (v_email IS NOT NULL AND lower(c.email) = lower(v_email))
  ) r;
  RETURN result;
END; $$;

GRANT EXECUTE ON FUNCTION public.portal_my_invitations() TO authenticated;

-- 5. Authenticated confirm/decline an invitation by id (no token)
CREATE OR REPLACE FUNCTION public.portal_respond_invitation(_invitation_id uuid, _response text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_token text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT i.token INTO v_token
  FROM public.vacancy_invitations i
  JOIN public.candidates c ON c.id = i.candidate_id
  WHERE i.id = _invitation_id
    AND (c.user_id = v_uid OR (v_email IS NOT NULL AND lower(c.email) = lower(v_email)));
  IF v_token IS NULL THEN RAISE EXCEPTION 'Invitation not found for current user'; END IF;
  RETURN public.vacancy_invitation_respond(v_token, _response);
END; $$;

GRANT EXECUTE ON FUNCTION public.portal_respond_invitation(uuid, text) TO authenticated;

-- 6. Replace vacancy_invitation_respond to enforce first-accept-wins per whole vacancy
CREATE OR REPLACE FUNCTION public.vacancy_invitation_respond(_token text, _response text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.vacancy_invitations%ROWTYPE;
  v_locked uuid;
  v_already_filled boolean := false;
  losers jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN RAISE EXCEPTION 'Invalid token'; END IF;
  IF _response NOT IN ('confirm','decline') THEN RAISE EXCEPTION 'Invalid response'; END IF;

  SELECT * INTO inv FROM public.vacancy_invitations WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF inv.expires_at < now() THEN RAISE EXCEPTION 'Invitation has expired'; END IF;
  IF inv.status IN ('confirmed','declined','cancelled','expired') THEN
    RETURN jsonb_build_object('already_responded', true, 'status', inv.status, 'vacancy_id', inv.vacancy_id, 'candidate_id', inv.candidate_id);
  END IF;

  IF _response = 'decline' THEN
    UPDATE public.vacancy_invitations
      SET status = 'declined', responded_at = now(), updated_at = now()
      WHERE id = inv.id;
    RETURN jsonb_build_object('status', 'declined', 'vacancy_id', inv.vacancy_id, 'candidate_id', inv.candidate_id);
  END IF;

  -- confirm path: lock vacancy row and check if already filled
  SELECT id INTO v_locked FROM public.vacancies WHERE id = inv.vacancy_id FOR UPDATE;

  SELECT EXISTS (
    SELECT 1 FROM public.vacancy_invitations
    WHERE vacancy_id = inv.vacancy_id AND status = 'confirmed'
  ) INTO v_already_filled;

  IF v_already_filled THEN
    UPDATE public.vacancy_invitations
      SET status = 'expired', responded_at = now(), updated_at = now()
      WHERE id = inv.id;
    RETURN jsonb_build_object('already_filled', true, 'status', 'expired', 'vacancy_id', inv.vacancy_id, 'candidate_id', inv.candidate_id);
  END IF;

  UPDATE public.vacancy_invitations
    SET status = 'confirmed', responded_at = now(), updated_at = now()
    WHERE id = inv.id;

  INSERT INTO public.vacancy_assignments (vacancy_id, candidate_id, stage, notes, assigned_by_email)
  VALUES (inv.vacancy_id, inv.candidate_id, 'placed'::public.vacancy_assignment_stage, 'Auto-confirmed: first accept wins', 'invitation-system')
  ON CONFLICT (vacancy_id, candidate_id) DO UPDATE
    SET stage = 'placed'::public.vacancy_assignment_stage, updated_at = now();

  -- Mark all other still-open invites for the same vacancy as expired and collect losers' emails for caller to notify
  WITH expired_rows AS (
    UPDATE public.vacancy_invitations i
      SET status = 'expired', responded_at = now(), updated_at = now()
      WHERE i.vacancy_id = inv.vacancy_id AND i.id <> inv.id AND i.status = 'sent'
    RETURNING i.candidate_id, i.id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('candidate_id', er.candidate_id, 'email', c.email, 'name', c.full_name)), '[]'::jsonb)
    INTO losers
    FROM expired_rows er JOIN public.candidates c ON c.id = er.candidate_id;

  RETURN jsonb_build_object(
    'status', 'confirmed',
    'vacancy_id', inv.vacancy_id,
    'candidate_id', inv.candidate_id,
    'losers', losers
  );
END; $$;
