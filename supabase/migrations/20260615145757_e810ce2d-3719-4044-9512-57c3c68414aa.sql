
-- 1. byow_generated_sites: drafts owner-only, published publicly readable
DROP POLICY IF EXISTS "Public can read generated sites" ON public.byow_generated_sites;
CREATE POLICY "Public can read published sites"
  ON public.byow_generated_sites
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');
CREATE POLICY "Owners can read their own sites"
  ON public.byow_generated_sites
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

-- 2. candidates: candidate can view own record
CREATE POLICY "Candidates can view own record"
  ON public.candidates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. candidate_events: candidate can view own events
CREATE POLICY "Candidates can view own events"
  ON public.candidate_events
  FOR SELECT
  TO authenticated
  USING (
    candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid())
  );

-- 4. vacancy_assignments: candidate can view own assignments
CREATE POLICY "Candidates can view own assignments"
  ON public.vacancy_assignments
  FOR SELECT
  TO authenticated
  USING (
    candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid())
  );

-- 5. vacancy_shifts: candidate can view own shifts
CREATE POLICY "Candidates can view own shifts"
  ON public.vacancy_shifts
  FOR SELECT
  TO authenticated
  USING (
    candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid())
  );

-- 6. vacancies: candidate can view vacancies they're assigned to
CREATE POLICY "Candidates can view vacancies they are assigned to"
  ON public.vacancies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT va.vacancy_id
      FROM public.vacancy_assignments va
      JOIN public.candidates c ON c.id = va.candidate_id
      WHERE c.user_id = auth.uid()
    )
  );

-- 7. chat_conversations: visitor can view their own conversation by client_id
CREATE POLICY "Clients can view own conversation"
  ON public.chat_conversations
  FOR SELECT
  TO anon, authenticated
  USING (
    client_id IS NOT NULL
    AND client_id = current_setting('request.headers', true)::jsonb ->> 'x-pixcellor-client-id'
  );

-- 8. chat_messages: visitor can view messages in their own conversation
CREATE POLICY "Clients can view messages in their own conversation"
  ON public.chat_messages
  FOR SELECT
  TO anon, authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.chat_conversations
      WHERE client_id IS NOT NULL
        AND client_id = current_setting('request.headers', true)::jsonb ->> 'x-pixcellor-client-id'
    )
  );

-- 9. Revoke EXECUTE on current_user_has_purchase from anon (uses auth.jwt())
REVOKE EXECUTE ON FUNCTION public.current_user_has_purchase() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_has_purchase() TO authenticated;
