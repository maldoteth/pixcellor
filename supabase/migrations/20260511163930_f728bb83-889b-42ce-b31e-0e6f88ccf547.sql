CREATE TABLE IF NOT EXISTS public.login_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_link_requests_email_time
  ON public.login_link_requests (email, created_at DESC);

ALTER TABLE public.login_link_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages login link requests"
  ON public.login_link_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');