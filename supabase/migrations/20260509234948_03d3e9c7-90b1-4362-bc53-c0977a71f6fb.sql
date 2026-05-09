
ALTER TABLE public.stripe_checkout_sessions
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS domain_status text,
  ADD COLUMN IF NOT EXISTS domain_top_up_gbp numeric;

CREATE TABLE IF NOT EXISTS public.domain_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  domain text NOT NULL,
  registrar text NOT NULL DEFAULT 'porkbun',
  status text NOT NULL DEFAULT 'pending',
  idempotency_key text,
  registrar_response jsonb,
  expires_at timestamptz,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_registrations_status ON public.domain_registrations(status);
CREATE INDEX IF NOT EXISTS idx_domain_registrations_domain ON public.domain_registrations(domain);

ALTER TABLE public.domain_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read domain registrations"
  ON public.domain_registrations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_domain_registrations_updated_at
  BEFORE UPDATE ON public.domain_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
