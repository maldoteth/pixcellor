DROP POLICY IF EXISTS "Public insert project status" ON public.project_status;
DROP POLICY IF EXISTS "Public read project status" ON public.project_status;
DROP POLICY IF EXISTS "Public update project status" ON public.project_status;
DROP POLICY IF EXISTS "Admins manage project status" ON public.project_status;
DROP POLICY IF EXISTS "Customers can read own project status" ON public.project_status;
DROP POLICY IF EXISTS "Customers can update own project status" ON public.project_status;

CREATE POLICY "Admins manage project status"
ON public.project_status
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Customers can read own project status"
ON public.project_status
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "Customers can update own project status"
ON public.project_status
FOR UPDATE
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
WITH CHECK (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));