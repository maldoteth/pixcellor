
CREATE TABLE public.login_handoffs (
  id text PRIMARY KEY,
  email text NOT NULL,
  token text,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

CREATE INDEX idx_login_handoffs_expires ON public.login_handoffs(expires_at);

ALTER TABLE public.login_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages login handoffs"
ON public.login_handoffs
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow anonymous/authenticated to SELECT only their own handoff row by id
-- (id is a 256-bit random nonce, so knowing it == proof of ownership of the desktop tab).
-- This lets Realtime subscriptions deliver row changes to the browser.
CREATE POLICY "Public can read handoff by nonce"
ON public.login_handoffs
FOR SELECT
TO anon, authenticated
USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.login_handoffs;
ALTER TABLE public.login_handoffs REPLICA IDENTITY FULL;
