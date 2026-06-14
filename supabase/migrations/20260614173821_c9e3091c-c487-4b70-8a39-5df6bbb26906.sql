GRANT SELECT, UPDATE ON public.call_bookings TO authenticated;

DROP POLICY IF EXISTS "Admins can view all call bookings" ON public.call_bookings;
DROP POLICY IF EXISTS "Admins can update call bookings" ON public.call_bookings;

CREATE POLICY "Admins can view all call bookings"
  ON public.call_bookings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update call bookings"
  ON public.call_bookings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));