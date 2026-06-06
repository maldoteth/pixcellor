
-- 1) Table
CREATE TABLE IF NOT EXISTS public.shift_timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  slot_index int NOT NULL DEFAULT 0,
  shift_date date NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  scheduled_start time,
  scheduled_finish time,
  actual_start timestamptz,
  actual_finish timestamptz,
  break_minutes int NOT NULL DEFAULT 0 CHECK (break_minutes >= 0 AND break_minutes <= 720),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected')),
  worker_notes text,
  admin_notes text,
  reject_reason text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by_user_id uuid,
  approved_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vacancy_id, slot_index, shift_date, candidate_id)
);

CREATE INDEX IF NOT EXISTS shift_timesheets_status_idx ON public.shift_timesheets (status, shift_date DESC);
CREATE INDEX IF NOT EXISTS shift_timesheets_candidate_idx ON public.shift_timesheets (candidate_id, shift_date DESC);
CREATE INDEX IF NOT EXISTS shift_timesheets_vacancy_idx ON public.shift_timesheets (vacancy_id, shift_date DESC);

GRANT SELECT, INSERT, UPDATE ON public.shift_timesheets TO authenticated;
GRANT ALL ON public.shift_timesheets TO service_role;

ALTER TABLE public.shift_timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can read their own timesheets"
  ON public.shift_timesheets FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Workers can insert pending timesheets for themselves"
  ON public.shift_timesheets FOR INSERT
  TO authenticated
  WITH CHECK (
    (status IN ('pending','submitted')
     AND EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND c.user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Workers can update their own pending timesheets"
  ON public.shift_timesheets FOR UPDATE
  TO authenticated
  USING (
    (status IN ('pending','submitted')
     AND EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND c.user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (status IN ('pending','submitted')
     AND EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND c.user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete timesheets"
  ON public.shift_timesheets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER shift_timesheets_set_updated_at
  BEFORE UPDATE ON public.shift_timesheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_timesheets;

-- 2) Helper: ensure a candidate has a linked auth user
CREATE OR REPLACE FUNCTION public._candidate_for_auth_user()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.candidates WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 3) Candidate clock-in: creates a pending row if missing, sets actual_start = now()
CREATE OR REPLACE FUNCTION public.candidate_timesheet_clock_in(_vacancy_id uuid, _slot integer, _date date)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_candidate uuid := public._candidate_for_auth_user();
  v_sched_start time;
  v_sched_finish time;
  v_row public.shift_timesheets%rowtype;
BEGIN
  IF v_candidate IS NULL THEN RAISE EXCEPTION 'No linked candidate profile'; END IF;

  SELECT coalesce(vs.start_time, v.start_time), coalesce(vs.finish_time, v.finish_time)
    INTO v_sched_start, v_sched_finish
    FROM public.vacancies v
    LEFT JOIN public.vacancy_shifts vs
      ON vs.vacancy_id = v.id AND vs.slot_index = coalesce(_slot,0) AND vs.shift_date = _date
   WHERE v.id = _vacancy_id;

  INSERT INTO public.shift_timesheets (
    vacancy_id, slot_index, shift_date, candidate_id,
    scheduled_start, scheduled_finish, actual_start, status
  ) VALUES (
    _vacancy_id, coalesce(_slot,0), _date, v_candidate,
    v_sched_start, v_sched_finish, now(), 'pending'
  )
  ON CONFLICT (vacancy_id, slot_index, shift_date, candidate_id) DO UPDATE
    SET actual_start = coalesce(public.shift_timesheets.actual_start, EXCLUDED.actual_start),
        status = CASE WHEN public.shift_timesheets.status IN ('approved','rejected') THEN public.shift_timesheets.status ELSE 'pending' END,
        updated_at = now()
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END; $$;

-- 4) Candidate clock-out
CREATE OR REPLACE FUNCTION public.candidate_timesheet_clock_out(_timesheet_id uuid, _break_minutes integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_candidate uuid := public._candidate_for_auth_user();
  v_row public.shift_timesheets%rowtype;
BEGIN
  IF v_candidate IS NULL THEN RAISE EXCEPTION 'No linked candidate profile'; END IF;
  UPDATE public.shift_timesheets
     SET actual_finish = now(),
         break_minutes = greatest(0, coalesce(_break_minutes, 0)),
         updated_at = now()
   WHERE id = _timesheet_id
     AND candidate_id = v_candidate
     AND status IN ('pending','submitted')
   RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Timesheet not editable'; END IF;
  RETURN to_jsonb(v_row);
END; $$;

-- 5) Candidate edit times / notes / break
CREATE OR REPLACE FUNCTION public.candidate_timesheet_update(
  _timesheet_id uuid,
  _actual_start timestamptz,
  _actual_finish timestamptz,
  _break_minutes integer,
  _worker_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_candidate uuid := public._candidate_for_auth_user();
  v_row public.shift_timesheets%rowtype;
BEGIN
  IF v_candidate IS NULL THEN RAISE EXCEPTION 'No linked candidate profile'; END IF;
  IF _actual_start IS NOT NULL AND _actual_finish IS NOT NULL AND _actual_finish < _actual_start THEN
    RAISE EXCEPTION 'Finish must be after start';
  END IF;
  UPDATE public.shift_timesheets
     SET actual_start = _actual_start,
         actual_finish = _actual_finish,
         break_minutes = greatest(0, coalesce(_break_minutes, break_minutes)),
         worker_notes = nullif(trim(coalesce(_worker_notes,'')),''),
         updated_at = now()
   WHERE id = _timesheet_id
     AND candidate_id = v_candidate
     AND status IN ('pending','submitted')
   RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Timesheet not editable'; END IF;
  RETURN to_jsonb(v_row);
END; $$;

-- 6) Candidate submit for approval
CREATE OR REPLACE FUNCTION public.candidate_timesheet_submit(_timesheet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_candidate uuid := public._candidate_for_auth_user();
  v_row public.shift_timesheets%rowtype;
BEGIN
  IF v_candidate IS NULL THEN RAISE EXCEPTION 'No linked candidate profile'; END IF;
  UPDATE public.shift_timesheets
     SET status = 'submitted',
         submitted_at = coalesce(submitted_at, now()),
         updated_at = now()
   WHERE id = _timesheet_id
     AND candidate_id = v_candidate
     AND status IN ('pending','submitted')
     AND actual_start IS NOT NULL
     AND actual_finish IS NOT NULL
   RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Timesheet not ready to submit'; END IF;
  RETURN to_jsonb(v_row);
END; $$;

-- 7) Candidate list own timesheets
CREATE OR REPLACE FUNCTION public.candidate_list_my_timesheets()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_candidate uuid := public._candidate_for_auth_user(); result jsonb;
BEGIN
  IF v_candidate IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.shift_date DESC), '[]'::jsonb)
    INTO result FROM (
      SELECT ts.*, v.title AS vacancy_title, c.name AS client_name
        FROM public.shift_timesheets ts
        JOIN public.vacancies v ON v.id = ts.vacancy_id
        LEFT JOIN public.contacts c ON c.id = v.client_contact_id
       WHERE ts.candidate_id = v_candidate
       ORDER BY ts.shift_date DESC, ts.created_at DESC
       LIMIT 200
    ) t;
  RETURN result;
END; $$;

-- 8) Admin list timesheets (optionally filter by status)
CREATE OR REPLACE FUNCTION public.portal_list_timesheets(_status text DEFAULT NULL, _limit integer DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public.portal_require_admin();
  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.shift_date DESC, t.created_at DESC), '[]'::jsonb)
    INTO result FROM (
      SELECT ts.*, v.title AS vacancy_title, v.charge_rate, v.pay_min, v.pay_max, v.pay_currency,
             c.name AS client_name, cand.full_name AS candidate_name
        FROM public.shift_timesheets ts
        JOIN public.vacancies v ON v.id = ts.vacancy_id
        LEFT JOIN public.contacts c ON c.id = v.client_contact_id
        JOIN public.candidates cand ON cand.id = ts.candidate_id
       WHERE _status IS NULL OR ts.status = _status
       ORDER BY ts.shift_date DESC, ts.created_at DESC
       LIMIT greatest(1, coalesce(_limit, 200))
    ) t;
  RETURN result;
END; $$;

-- 9) Admin: approve (optionally adjusting times)
CREATE OR REPLACE FUNCTION public.portal_timesheet_approve(
  _timesheet_id uuid,
  _actual_start timestamptz DEFAULT NULL,
  _actual_finish timestamptz DEFAULT NULL,
  _break_minutes integer DEFAULT NULL,
  _admin_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.shift_timesheets%rowtype; admin_email text;
BEGIN
  PERFORM public.portal_require_admin();
  SELECT lower(email) INTO admin_email FROM auth.users WHERE id = auth.uid();
  UPDATE public.shift_timesheets
     SET actual_start = coalesce(_actual_start, actual_start),
         actual_finish = coalesce(_actual_finish, actual_finish),
         break_minutes = coalesce(_break_minutes, break_minutes),
         admin_notes = coalesce(nullif(trim(coalesce(_admin_notes,'')),''), admin_notes),
         status = 'approved',
         approved_at = now(),
         approved_by_user_id = auth.uid(),
         approved_by_email = admin_email,
         reject_reason = NULL,
         updated_at = now()
   WHERE id = _timesheet_id
   RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Timesheet not found'; END IF;
  RETURN to_jsonb(v_row);
END; $$;

-- 10) Admin: reject
CREATE OR REPLACE FUNCTION public.portal_timesheet_reject(_timesheet_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.shift_timesheets%rowtype;
BEGIN
  PERFORM public.portal_require_admin();
  UPDATE public.shift_timesheets
     SET status = 'rejected',
         reject_reason = nullif(trim(coalesce(_reason,'')),''),
         updated_at = now()
   WHERE id = _timesheet_id
   RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Timesheet not found'; END IF;
  RETURN to_jsonb(v_row);
END; $$;

GRANT EXECUTE ON FUNCTION public.candidate_timesheet_clock_in(uuid, integer, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_timesheet_clock_out(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_timesheet_update(uuid, timestamptz, timestamptz, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_timesheet_submit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_list_my_timesheets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_timesheets(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_timesheet_approve(uuid, timestamptz, timestamptz, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_timesheet_reject(uuid, text) TO authenticated;
