
-- Enum
DO $$ BEGIN
  CREATE TYPE public.vacancy_invitation_status AS ENUM ('sent','confirmed','declined','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.vacancy_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status public.vacancy_invitation_status NOT NULL DEFAULT 'sent',
  ai_score numeric,
  ai_reason text,
  custom_message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  sent_by_user_id uuid,
  sent_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vac_inv_vacancy ON public.vacancy_invitations(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_vac_inv_candidate ON public.vacancy_invitations(candidate_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacancy_invitations TO authenticated;
GRANT ALL ON public.vacancy_invitations TO service_role;

ALTER TABLE public.vacancy_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vacancy invitations" ON public.vacancy_invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER vacancy_invitations_set_updated_at
  BEFORE UPDATE ON public.vacancy_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ranking RPC
CREATE OR REPLACE FUNCTION public.portal_rank_candidates_for_vacancy(_vacancy_id uuid, _limit int DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v public.vacancies%ROWTYPE; result jsonb;
BEGIN
  PERFORM public.portal_require_admin();
  SELECT * INTO v FROM public.vacancies WHERE id = _vacancy_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vacancy not found'; END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.score DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT c.id, c.full_name, c.email, c.phone, c.headline, c.location, c.skills, c.status,
           c.right_to_work, c.desired_work_type, c.desired_arrangement, c.years_experience,
      (
        (SELECT count(*) FROM unnest(coalesce(c.skills,'{}')) s WHERE s = ANY(coalesce(v.required_skills,'{}')))::int * 5
        + (SELECT count(*) FROM unnest(coalesce(c.skills,'{}')) s WHERE s = ANY(coalesce(v.nice_to_have_skills,'{}')))::int * 2
        + CASE WHEN v.location IS NOT NULL AND lower(coalesce(c.location,'')) LIKE '%'||lower(v.location)||'%' THEN 3 ELSE 0 END
        + (SELECT count(*) FROM unnest(coalesce(c.preferred_locations,'{}')) p WHERE v.location IS NOT NULL AND lower(v.location) LIKE '%'||lower(p)||'%')::int * 2
        + CASE WHEN v.right_to_work_required AND c.right_to_work IN ('uk_citizen','settled') THEN 2
               WHEN v.right_to_work_required AND c.right_to_work = 'visa_required' THEN -2 ELSE 0 END
        + CASE WHEN v.arrangement::text = c.desired_arrangement::text THEN 2 ELSE 0 END
      ) AS score
    FROM public.candidates c
    WHERE c.status NOT IN ('archived','rejected','placed')
    ORDER BY score DESC, c.updated_at DESC
    LIMIT GREATEST(_limit, 1)
  ) t
  WHERE t.score > 0;
  RETURN coalesce(result,'[]'::jsonb);
END; $$;

-- Public response RPC (no admin check; uses token)
CREATE OR REPLACE FUNCTION public.vacancy_invitation_respond(_token text, _response text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE inv public.vacancy_invitations%ROWTYPE; new_status public.vacancy_invitation_status;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN RAISE EXCEPTION 'Invalid token'; END IF;
  IF _response NOT IN ('confirm','decline') THEN RAISE EXCEPTION 'Invalid response'; END IF;

  SELECT * INTO inv FROM public.vacancy_invitations WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF inv.expires_at < now() THEN RAISE EXCEPTION 'Invitation has expired'; END IF;
  IF inv.status IN ('confirmed','declined','cancelled') THEN
    RETURN jsonb_build_object('already_responded', true, 'status', inv.status, 'vacancy_id', inv.vacancy_id, 'candidate_id', inv.candidate_id);
  END IF;

  new_status := CASE WHEN _response = 'confirm' THEN 'confirmed' ELSE 'declined' END;
  UPDATE public.vacancy_invitations
    SET status = new_status, responded_at = now(), updated_at = now()
    WHERE id = inv.id;

  IF _response = 'confirm' THEN
    INSERT INTO public.vacancy_assignments (vacancy_id, candidate_id, stage, notes, assigned_by_email)
    VALUES (inv.vacancy_id, inv.candidate_id, 'offer'::public.vacancy_assignment_stage, 'Self-confirmed via email invite', 'invitation-system')
    ON CONFLICT (vacancy_id, candidate_id) DO UPDATE
      SET stage = 'offer'::public.vacancy_assignment_stage, updated_at = now();
  END IF;

  RETURN jsonb_build_object('status', new_status, 'vacancy_id', inv.vacancy_id, 'candidate_id', inv.candidate_id);
END; $$;

GRANT EXECUTE ON FUNCTION public.vacancy_invitation_respond(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_rank_candidates_for_vacancy(uuid, int) TO authenticated;
