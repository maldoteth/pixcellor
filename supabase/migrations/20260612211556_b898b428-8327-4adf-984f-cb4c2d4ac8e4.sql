
-- Function: has the current authenticated user purchased anything?
CREATE OR REPLACE FUNCTION public.current_user_has_purchase()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stripe_checkout_sessions s
    WHERE lower(s.customer_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      AND s.payment_status = 'paid'
  );
$$;

-- Reviews table
CREATE TABLE public.package_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_slug text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_slug, user_id)
);

CREATE INDEX idx_package_reviews_slug ON public.package_reviews(package_slug);

GRANT SELECT ON public.package_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_reviews TO authenticated;
GRANT ALL ON public.package_reviews TO service_role;

ALTER TABLE public.package_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are public to read"
  ON public.package_reviews FOR SELECT
  USING (true);

CREATE POLICY "Customers who purchased can insert a review"
  ON public.package_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.current_user_has_purchase());

CREATE POLICY "Authors can update their own review"
  ON public.package_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.current_user_has_purchase());

CREATE POLICY "Authors can delete their own review"
  ON public.package_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
