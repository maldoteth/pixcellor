CREATE TABLE public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  checkout_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stripe_checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  stripe_event_id TEXT NOT NULL,
  mode TEXT,
  payment_status TEXT,
  status TEXT,
  amount_total BIGINT,
  currency TEXT,
  customer_email TEXT,
  customer_id TEXT,
  subscription_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stripe_checkout_sessions_stripe_event_fk
    FOREIGN KEY (stripe_event_id)
    REFERENCES public.stripe_events (stripe_event_id)
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to stripe events"
ON public.stripe_events
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY "No public access to stripe sessions"
ON public.stripe_checkout_sessions
FOR ALL
USING (false)
WITH CHECK (false);

CREATE INDEX idx_stripe_events_checkout_session_id
  ON public.stripe_events (checkout_session_id);

CREATE INDEX idx_stripe_checkout_sessions_subscription_id
  ON public.stripe_checkout_sessions (subscription_id);

CREATE INDEX idx_stripe_checkout_sessions_customer_id
  ON public.stripe_checkout_sessions (customer_id);

CREATE TRIGGER update_stripe_checkout_sessions_updated_at
  BEFORE UPDATE ON public.stripe_checkout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
