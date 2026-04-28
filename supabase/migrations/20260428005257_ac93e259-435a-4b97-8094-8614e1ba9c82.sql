CREATE OR REPLACE FUNCTION public.portal_mark_order_undelivered(_access_code text, _session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.portal_require_access(_access_code);

  UPDATE public.stripe_checkout_sessions
  SET order_status = 'open',
      delivered_at = NULL,
      delivered_domain = NULL,
      updated_at = now()
  WHERE session_id = _session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$function$;