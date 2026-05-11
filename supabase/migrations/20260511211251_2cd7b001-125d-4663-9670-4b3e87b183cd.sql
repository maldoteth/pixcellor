-- Remove the dangerous policy that allows any anonymous visitor to UPDATE
-- any row in client_profiles. All legitimate updates happen in edge functions
-- via the service role, which bypasses RLS, so this is safe.
DROP POLICY IF EXISTS "Public can update enquiry profile fields" ON public.client_profiles;