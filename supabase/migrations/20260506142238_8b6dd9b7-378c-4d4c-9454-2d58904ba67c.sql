
ALTER TABLE public.stripe_checkout_sessions
  ADD COLUMN IF NOT EXISTS payment_intent_id text,
  ADD COLUMN IF NOT EXISTS capture_status text,
  ADD COLUMN IF NOT EXISTS auth_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

CREATE INDEX IF NOT EXISTS idx_scs_capture_status
  ON public.stripe_checkout_sessions(capture_status)
  WHERE capture_status = 'requires_capture';

CREATE INDEX IF NOT EXISTS idx_scs_auth_expires_at
  ON public.stripe_checkout_sessions(auth_expires_at)
  WHERE capture_status = 'requires_capture';
