ALTER TABLE public.stripe_checkout_sessions
ADD COLUMN IF NOT EXISTS order_status text NOT NULL DEFAULT 'open',
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.portal_mark_order_delivered(_access_code text, _session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.portal_require_access(_access_code);

  UPDATE public.stripe_checkout_sessions
  SET order_status = 'delivered',
      delivered_at = coalesce(delivered_at, now()),
      updated_at = now()
  WHERE session_id = _session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.portal_mark_order_delivered(text, text) TO anon, authenticated;