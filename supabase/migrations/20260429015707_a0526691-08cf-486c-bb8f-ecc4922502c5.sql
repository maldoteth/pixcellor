DROP POLICY IF EXISTS "Allow reading contact inquiries" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Admins can read contact inquiries" ON public.contact_inquiries;

CREATE POLICY "Admins can read contact inquiries"
ON public.contact_inquiries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));