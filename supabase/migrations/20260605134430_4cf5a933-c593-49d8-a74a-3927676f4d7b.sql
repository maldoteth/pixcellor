CREATE TYPE public.candidate_status AS ENUM ('new','screening','shortlisted','submitted','interviewing','offer','placed','rejected','on_hold','archived');
CREATE TYPE public.candidate_source AS ENUM ('chatbot','manual','referral','website','linkedin','job_board','apply_page','other');
CREATE TYPE public.candidate_right_to_work AS ENUM ('uk_citizen','settled','visa_required','unknown');
CREATE TYPE public.candidate_work_type AS ENUM ('permanent','contract','temp','freelance','any');
CREATE TYPE public.candidate_arrangement AS ENUM ('onsite','hybrid','remote','any');

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  location text,
  right_to_work public.candidate_right_to_work DEFAULT 'unknown',
  linkedin_url text,
  portfolio_url text,
  cv_url text,
  headline text,
  summary text,
  years_experience integer,
  current_role_title text,
  current_employer text,
  notice_period_weeks integer,
  availability_date date,
  desired_salary_min integer,
  desired_salary_max integer,
  salary_currency text DEFAULT 'GBP',
  desired_work_type public.candidate_work_type DEFAULT 'any',
  desired_arrangement public.candidate_arrangement DEFAULT 'any',
  skills text[] DEFAULT ARRAY[]::text[],
  industries text[] DEFAULT ARRAY[]::text[],
  preferred_locations text[] DEFAULT ARRAY[]::text[],
  status public.candidate_status NOT NULL DEFAULT 'new',
  rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  source public.candidate_source NOT NULL DEFAULT 'manual',
  source_detail text,
  assigned_to_user_id uuid,
  notes text,
  tags text[] DEFAULT ARRAY[]::text[],
  created_by_user_id uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidates_status ON public.candidates(status);
CREATE INDEX idx_candidates_email ON public.candidates(lower(email));
CREATE INDEX idx_candidates_skills ON public.candidates USING gin(skills);
CREATE INDEX idx_candidates_locations ON public.candidates USING gin(preferred_locations);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage candidates" ON public.candidates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE public.candidate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'note',
  title text NOT NULL,
  description text,
  callback_at timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by_user_id uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidate_events_candidate ON public.candidate_events(candidate_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_events TO authenticated;
GRANT ALL ON public.candidate_events TO service_role;
ALTER TABLE public.candidate_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage candidate events" ON public.candidate_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE public.candidate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'cv',
  file_url text NOT NULL,
  filename text,
  size_bytes bigint,
  mime_type text,
  uploaded_by_user_id uuid,
  uploaded_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidate_documents_candidate ON public.candidate_documents(candidate_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_documents TO authenticated;
GRANT ALL ON public.candidate_documents TO service_role;
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage candidate docs" ON public.candidate_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE public.candidate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  role_title text NOT NULL,
  client_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  stage text NOT NULL DEFAULT 'submitted',
  outcome text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidate_applications_candidate ON public.candidate_applications(candidate_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_applications TO authenticated;
GRANT ALL ON public.candidate_applications TO service_role;
ALTER TABLE public.candidate_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage candidate applications" ON public.candidate_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER trg_candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_candidate_events_updated_at BEFORE UPDATE ON public.candidate_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_candidate_applications_updated_at BEFORE UPDATE ON public.candidate_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_events;

CREATE OR REPLACE FUNCTION public.portal_create_candidate(
  _full_name text, _email text DEFAULT NULL, _phone text DEFAULT NULL, _location text DEFAULT NULL,
  _headline text DEFAULT NULL, _summary text DEFAULT NULL, _years_experience integer DEFAULT NULL,
  _current_role_title text DEFAULT NULL, _current_employer text DEFAULT NULL,
  _notice_period_weeks integer DEFAULT NULL, _availability_date date DEFAULT NULL,
  _desired_salary_min integer DEFAULT NULL, _desired_salary_max integer DEFAULT NULL,
  _salary_currency text DEFAULT 'GBP',
  _desired_work_type public.candidate_work_type DEFAULT 'any',
  _desired_arrangement public.candidate_arrangement DEFAULT 'any',
  _right_to_work public.candidate_right_to_work DEFAULT 'unknown',
  _skills text[] DEFAULT NULL, _industries text[] DEFAULT NULL, _preferred_locations text[] DEFAULT NULL,
  _linkedin_url text DEFAULT NULL, _portfolio_url text DEFAULT NULL, _cv_url text DEFAULT NULL,
  _notes text DEFAULT NULL, _tags text[] DEFAULT NULL,
  _source public.candidate_source DEFAULT 'manual', _source_detail text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  clean_name text := nullif(trim(_full_name), '');
  clean_email text := nullif(trim(coalesce(_email,'')), '');
  clean_phone text := nullif(trim(coalesce(_phone,'')), '');
  admin_email text;
  new_row public.candidates%rowtype;
BEGIN
  PERFORM public.portal_require_admin();
  IF clean_name IS NULL OR length(clean_name) > 120 THEN
    RAISE EXCEPTION 'Candidate name is required and must be 120 characters or fewer';
  END IF;
  IF clean_email IS NOT NULL AND (length(clean_email) > 255 OR clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$') THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;
  IF clean_email IS NULL AND clean_phone IS NULL THEN
    RAISE EXCEPTION 'Provide an email or phone number';
  END IF;

  SELECT lower(email) INTO admin_email FROM auth.users WHERE id = auth.uid() LIMIT 1;

  INSERT INTO public.candidates (
    full_name, email, phone, location, headline, summary, years_experience,
    current_role_title, current_employer, notice_period_weeks, availability_date,
    desired_salary_min, desired_salary_max, salary_currency,
    desired_work_type, desired_arrangement, right_to_work,
    skills, industries, preferred_locations,
    linkedin_url, portfolio_url, cv_url, notes, tags,
    source, source_detail, created_by_user_id, created_by_email
  ) VALUES (
    clean_name, lower(clean_email), clean_phone,
    nullif(trim(coalesce(_location,'')),''),
    nullif(trim(coalesce(_headline,'')),''),
    nullif(trim(coalesce(_summary,'')),''),
    _years_experience,
    nullif(trim(coalesce(_current_role_title,'')),''),
    nullif(trim(coalesce(_current_employer,'')),''),
    _notice_period_weeks, _availability_date,
    _desired_salary_min, _desired_salary_max, coalesce(_salary_currency,'GBP'),
    coalesce(_desired_work_type,'any'), coalesce(_desired_arrangement,'any'),
    coalesce(_right_to_work,'unknown'),
    coalesce(_skills, ARRAY[]::text[]),
    coalesce(_industries, ARRAY[]::text[]),
    coalesce(_preferred_locations, ARRAY[]::text[]),
    nullif(trim(coalesce(_linkedin_url,'')),''),
    nullif(trim(coalesce(_portfolio_url,'')),''),
    nullif(trim(coalesce(_cv_url,'')),''),
    nullif(trim(coalesce(_notes,'')),''),
    coalesce(_tags, ARRAY[]::text[]),
    coalesce(_source,'manual'), nullif(trim(coalesce(_source_detail,'')),''),
    auth.uid(), admin_email
  ) RETURNING * INTO new_row;
  RETURN to_jsonb(new_row);
END; $$;

CREATE OR REPLACE FUNCTION public.portal_update_candidate(_id uuid, _patch jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.portal_require_admin();
  UPDATE public.candidates SET
    full_name = coalesce(_patch->>'full_name', full_name),
    email = coalesce(lower(nullif(_patch->>'email','')), email),
    phone = coalesce(_patch->>'phone', phone),
    location = coalesce(_patch->>'location', location),
    headline = coalesce(_patch->>'headline', headline),
    summary = coalesce(_patch->>'summary', summary),
    current_role_title = coalesce(_patch->>'current_role_title', current_role_title),
    current_employer = coalesce(_patch->>'current_employer', current_employer),
    years_experience = coalesce((_patch->>'years_experience')::int, years_experience),
    notice_period_weeks = coalesce((_patch->>'notice_period_weeks')::int, notice_period_weeks),
    availability_date = coalesce((_patch->>'availability_date')::date, availability_date),
    desired_salary_min = coalesce((_patch->>'desired_salary_min')::int, desired_salary_min),
    desired_salary_max = coalesce((_patch->>'desired_salary_max')::int, desired_salary_max),
    salary_currency = coalesce(_patch->>'salary_currency', salary_currency),
    desired_work_type = coalesce((_patch->>'desired_work_type')::public.candidate_work_type, desired_work_type),
    desired_arrangement = coalesce((_patch->>'desired_arrangement')::public.candidate_arrangement, desired_arrangement),
    right_to_work = coalesce((_patch->>'right_to_work')::public.candidate_right_to_work, right_to_work),
    linkedin_url = coalesce(_patch->>'linkedin_url', linkedin_url),
    portfolio_url = coalesce(_patch->>'portfolio_url', portfolio_url),
    cv_url = coalesce(_patch->>'cv_url', cv_url),
    notes = coalesce(_patch->>'notes', notes),
    rating = coalesce((_patch->>'rating')::smallint, rating),
    skills = CASE WHEN _patch ? 'skills' THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'skills')) ELSE skills END,
    industries = CASE WHEN _patch ? 'industries' THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'industries')) ELSE industries END,
    preferred_locations = CASE WHEN _patch ? 'preferred_locations' THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'preferred_locations')) ELSE preferred_locations END,
    tags = CASE WHEN _patch ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(_patch->'tags')) ELSE tags END,
    updated_at = now()
  WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidate not found'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.portal_update_candidate_status(_id uuid, _status public.candidate_status, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_status public.candidate_status; admin_email text;
BEGIN
  PERFORM public.portal_require_admin();
  SELECT lower(email) INTO admin_email FROM auth.users WHERE id = auth.uid() LIMIT 1;
  SELECT status INTO old_status FROM public.candidates WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidate not found'; END IF;
  UPDATE public.candidates SET status = _status, updated_at = now() WHERE id = _id;
  INSERT INTO public.candidate_events(candidate_id, event_type, title, description, created_by_user_id, created_by_email)
  VALUES (_id, 'status_change', concat(old_status::text,' → ',_status::text), nullif(trim(coalesce(_note,'')),''), auth.uid(), admin_email);
END; $$;

CREATE OR REPLACE FUNCTION public.portal_create_candidate_event(
  _candidate_id uuid, _title text, _description text DEFAULT NULL,
  _event_type text DEFAULT 'note', _callback_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE clean_title text := nullif(trim(_title),''); admin_email text; new_event public.candidate_events%rowtype;
BEGIN
  PERFORM public.portal_require_admin();
  IF clean_title IS NULL OR length(clean_title) > 200 THEN RAISE EXCEPTION 'Title required (max 200 chars)'; END IF;
  SELECT lower(email) INTO admin_email FROM auth.users WHERE id = auth.uid() LIMIT 1;
  INSERT INTO public.candidate_events(candidate_id, event_type, title, description, callback_at, created_by_user_id, created_by_email)
  VALUES (_candidate_id, coalesce(_event_type,'note'), clean_title, nullif(trim(coalesce(_description,'')),''), _callback_at, auth.uid(), admin_email)
  RETURNING * INTO new_event;
  RETURN to_jsonb(new_event);
END; $$;

CREATE OR REPLACE FUNCTION public.portal_complete_candidate_callback(_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.portal_require_admin();
  UPDATE public.candidate_events SET completed_at = now(), updated_at = now() WHERE id = _event_id;
END; $$;

CREATE OR REPLACE FUNCTION public.portal_add_candidate_document(
  _candidate_id uuid, _kind text, _file_url text, _filename text DEFAULT NULL,
  _size_bytes bigint DEFAULT NULL, _mime_type text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_email text; new_doc public.candidate_documents%rowtype;
BEGIN
  PERFORM public.portal_require_admin();
  IF _file_url IS NULL OR length(_file_url) < 3 OR length(_file_url) > 2000 THEN RAISE EXCEPTION 'Valid file URL required'; END IF;
  SELECT lower(email) INTO admin_email FROM auth.users WHERE id = auth.uid() LIMIT 1;
  INSERT INTO public.candidate_documents(candidate_id, kind, file_url, filename, size_bytes, mime_type, uploaded_by_user_id, uploaded_by_email)
  VALUES (_candidate_id, coalesce(_kind,'cv'), _file_url, _filename, _size_bytes, _mime_type, auth.uid(), admin_email)
  RETURNING * INTO new_doc;
  IF coalesce(_kind,'cv') = 'cv' THEN UPDATE public.candidates SET cv_url = _file_url, updated_at = now() WHERE id = _candidate_id; END IF;
  RETURN to_jsonb(new_doc);
END; $$;

CREATE OR REPLACE FUNCTION public.create_candidate_from_intake(_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  clean_name text := nullif(trim(coalesce(_payload->>'full_name','')),'');
  clean_email text := lower(nullif(trim(coalesce(_payload->>'email','')),''));
  clean_phone text := nullif(trim(coalesce(_payload->>'phone','')),'');
  existing_id uuid;
  new_row public.candidates%rowtype;
BEGIN
  IF clean_name IS NULL OR length(clean_name) > 120 THEN RAISE EXCEPTION 'Name required'; END IF;
  IF clean_email IS NULL AND clean_phone IS NULL THEN RAISE EXCEPTION 'Email or phone required'; END IF;
  IF clean_email IS NOT NULL AND clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN RAISE EXCEPTION 'Invalid email'; END IF;

  IF clean_email IS NOT NULL THEN
    SELECT id INTO existing_id FROM public.candidates WHERE lower(email) = clean_email LIMIT 1;
  END IF;
  IF existing_id IS NULL AND clean_phone IS NOT NULL THEN
    SELECT id INTO existing_id FROM public.candidates WHERE phone = clean_phone LIMIT 1;
  END IF;

  IF existing_id IS NOT NULL THEN
    UPDATE public.candidates SET
      headline = coalesce(nullif(_payload->>'headline',''), headline),
      summary = coalesce(nullif(_payload->>'summary',''), summary),
      current_role_title = coalesce(nullif(_payload->>'current_role_title',''), current_role_title),
      location = coalesce(nullif(_payload->>'location',''), location),
      notes = coalesce(nullif(_payload->>'notes',''), notes),
      skills = CASE WHEN _payload ? 'skills' THEN ARRAY(SELECT jsonb_array_elements_text(_payload->'skills')) ELSE skills END,
      cv_url = coalesce(nullif(_payload->>'cv_url',''), cv_url),
      updated_at = now()
    WHERE id = existing_id;
    INSERT INTO public.candidate_events(candidate_id, event_type, title, description)
    VALUES (existing_id, 'intake_update', 'Updated via '||coalesce(_payload->>'source','intake'), _payload->>'transcript');
    SELECT * INTO new_row FROM public.candidates WHERE id = existing_id;
    RETURN jsonb_build_object('candidate', to_jsonb(new_row), 'created', false);
  END IF;

  INSERT INTO public.candidates(
    full_name, email, phone, location, headline, summary, current_role_title,
    years_experience, desired_work_type, desired_arrangement, right_to_work,
    skills, cv_url, linkedin_url, portfolio_url, notes,
    source, source_detail
  ) VALUES (
    clean_name, clean_email, clean_phone,
    nullif(_payload->>'location',''),
    nullif(_payload->>'headline',''),
    nullif(_payload->>'summary',''),
    nullif(_payload->>'current_role_title',''),
    nullif(_payload->>'years_experience','')::int,
    coalesce((nullif(_payload->>'desired_work_type',''))::public.candidate_work_type, 'any'),
    coalesce((nullif(_payload->>'desired_arrangement',''))::public.candidate_arrangement, 'any'),
    coalesce((nullif(_payload->>'right_to_work',''))::public.candidate_right_to_work, 'unknown'),
    CASE WHEN _payload ? 'skills' THEN ARRAY(SELECT jsonb_array_elements_text(_payload->'skills')) ELSE ARRAY[]::text[] END,
    nullif(_payload->>'cv_url',''),
    nullif(_payload->>'linkedin_url',''),
    nullif(_payload->>'portfolio_url',''),
    nullif(_payload->>'notes',''),
    coalesce((nullif(_payload->>'source',''))::public.candidate_source,'chatbot'),
    nullif(_payload->>'source_detail','')
  ) RETURNING * INTO new_row;

  INSERT INTO public.candidate_events(candidate_id, event_type, title, description)
  VALUES (new_row.id, 'intake', 'Captured via '||coalesce(_payload->>'source','intake'), _payload->>'transcript');

  RETURN jsonb_build_object('candidate', to_jsonb(new_row), 'created', true);
END; $$;

CREATE OR REPLACE FUNCTION public.portal_match_candidates_for_contact(_contact_id uuid, _limit int DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ctx text; loc text; result jsonb;
BEGIN
  PERFORM public.portal_require_admin();
  SELECT lower(coalesce(notes,'') || ' ' || coalesce(industry,'') || ' ' || coalesce(name,'')),
         lower(coalesce(location,''))
    INTO ctx, loc
    FROM public.contacts WHERE id = _contact_id;
  IF ctx IS NULL THEN RAISE EXCEPTION 'Contact not found'; END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.score DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT c.*,
      (
        (SELECT count(*) FROM unnest(c.skills) s WHERE ctx LIKE '%'||lower(s)||'%')::int * 3
        + CASE WHEN loc <> '' AND lower(coalesce(c.location,'')) LIKE '%'||loc||'%' THEN 2 ELSE 0 END
        + (SELECT count(*) FROM unnest(c.preferred_locations) p WHERE loc <> '' AND loc LIKE '%'||lower(p)||'%')::int
      ) AS score
    FROM public.candidates c
    WHERE c.status NOT IN ('archived','rejected','placed')
    ORDER BY score DESC, c.updated_at DESC
    LIMIT _limit
  ) t
  WHERE t.score > 0;
  RETURN coalesce(result,'[]'::jsonb);
END; $$;