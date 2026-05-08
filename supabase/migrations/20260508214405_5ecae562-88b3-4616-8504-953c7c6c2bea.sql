-- Add delivery + payment tracking columns to free sample leads
ALTER TABLE public.lets_talk_leads
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_domain text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_session_id text,
  ADD COLUMN IF NOT EXISTS package_name text;

-- RPC: admin marks a sample as delivered
CREATE OR REPLACE FUNCTION public.portal_mark_sample_delivered(
  _sample_id uuid,
  _delivered_domain text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.portal_require_admin();

  UPDATE public.lets_talk_leads
     SET delivered_at = COALESCE(delivered_at, now()),
         delivered_domain = lower(_delivered_domain)
   WHERE id = _sample_id
     AND source = 'free_sample_request';
END;
$$;

-- RPC: admin marks a sample as undelivered (revert)
CREATE OR REPLACE FUNCTION public.portal_mark_sample_undelivered(
  _sample_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.portal_require_admin();

  UPDATE public.lets_talk_leads
     SET delivered_at = NULL,
         delivered_domain = NULL
   WHERE id = _sample_id
     AND source = 'free_sample_request';
END;
$$;

-- Trigger: when a stripe checkout session is paid, mark any matching
-- free-sample lead (by email) as paid so admin sees "Paid" automatically.
CREATE OR REPLACE FUNCTION public.match_paid_session_to_sample()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND NEW.customer_email IS NOT NULL THEN
    UPDATE public.lets_talk_leads
       SET paid_at = COALESCE(paid_at, now()),
           paid_session_id = COALESCE(paid_session_id, NEW.session_id),
           package_name = COALESCE(package_name, NULLIF(NEW.metadata->>'package_name', ''))
     WHERE source = 'free_sample_request'
       AND paid_at IS NULL
       AND lower(email) = lower(NEW.customer_email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_paid_session_to_sample ON public.stripe_checkout_sessions;
CREATE TRIGGER trg_match_paid_session_to_sample
AFTER INSERT OR UPDATE OF payment_status, customer_email ON public.stripe_checkout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.match_paid_session_to_sample();

-- Backfill: match any existing paid sessions to existing samples
UPDATE public.lets_talk_leads l
   SET paid_at = COALESCE(l.paid_at, s.created_at),
       paid_session_id = COALESCE(l.paid_session_id, s.session_id),
       package_name = COALESCE(l.package_name, NULLIF(s.metadata->>'package_name', ''))
  FROM public.stripe_checkout_sessions s
 WHERE l.source = 'free_sample_request'
   AND l.paid_at IS NULL
   AND s.payment_status = 'paid'
   AND s.customer_email IS NOT NULL
   AND lower(s.customer_email) = lower(l.email);