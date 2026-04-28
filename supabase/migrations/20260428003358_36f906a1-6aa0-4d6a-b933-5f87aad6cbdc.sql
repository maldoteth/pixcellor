DROP POLICY IF EXISTS "Customers can submit project requirements" ON public.project_requirements;
DROP POLICY IF EXISTS "Customers can update project requirements for paid orders" ON public.project_requirements;

CREATE POLICY "Backend can manage project requirements"
ON public.project_requirements
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');