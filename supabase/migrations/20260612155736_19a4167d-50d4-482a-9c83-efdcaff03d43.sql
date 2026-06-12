
DROP POLICY IF EXISTS "Candidate can view own availability" ON public.candidate_availability;
DROP POLICY IF EXISTS "Candidate can insert own availability" ON public.candidate_availability;
DROP POLICY IF EXISTS "Candidate can update own availability" ON public.candidate_availability;
DROP POLICY IF EXISTS "Candidate can delete own availability" ON public.candidate_availability;

CREATE POLICY "Candidate can view own availability"
ON public.candidate_availability FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.candidates c
  WHERE c.id = candidate_availability.candidate_id
    AND c.user_id = auth.uid()
));

CREATE POLICY "Candidate can insert own availability"
ON public.candidate_availability FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.candidates c
  WHERE c.id = candidate_availability.candidate_id
    AND c.user_id = auth.uid()
));

CREATE POLICY "Candidate can update own availability"
ON public.candidate_availability FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.candidates c
  WHERE c.id = candidate_availability.candidate_id
    AND c.user_id = auth.uid()
));

CREATE POLICY "Candidate can delete own availability"
ON public.candidate_availability FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.candidates c
  WHERE c.id = candidate_availability.candidate_id
    AND c.user_id = auth.uid()
));
