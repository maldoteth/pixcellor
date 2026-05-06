-- Refund / dispute tracking on checkout sessions
ALTER TABLE public.stripe_checkout_sessions
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_amount bigint,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS dispute_id text,
  ADD COLUMN IF NOT EXISTS dispute_status text,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS dispute_amount bigint,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_scs_dispute_status
  ON public.stripe_checkout_sessions(dispute_status)
  WHERE dispute_status IS NOT NULL;

-- Centralized error / event monitoring (Sentry-lite)
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  title text NOT NULL,
  message text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_unresolved
  ON public.admin_alerts(created_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity
  ON public.admin_alerts(severity, created_at DESC);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage admin alerts"
  ON public.admin_alerts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages admin alerts"
  ON public.admin_alerts
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');