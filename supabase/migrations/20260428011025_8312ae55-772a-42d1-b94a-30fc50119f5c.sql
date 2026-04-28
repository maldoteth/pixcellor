CREATE OR REPLACE FUNCTION public.portal_mark_order_delivered(_access_code text, _session_id text, _delivered_domain text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clean_domain text := lower(trim(coalesce(_delivered_domain, '')));
BEGIN
  PERFORM public.portal_require_access(_access_code);

  clean_domain := regexp_replace(clean_domain, '^https?://', '', 'i');
  clean_domain := regexp_replace(clean_domain, '/.*$', '');
  clean_domain := regexp_replace(clean_domain, '^www\.', '', 'i');

  IF clean_domain IS NULL OR clean_domain = '' OR length(clean_domain) > 253 OR clean_domain !~* '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$' THEN
    RAISE EXCEPTION 'Enter a valid delivered domain';
  END IF;

  UPDATE public.stripe_checkout_sessions
  SET order_status = 'delivered',
      delivered_at = coalesce(delivered_at, now()),
      delivered_domain = clean_domain,
      updated_at = now()
  WHERE session_id = _session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.portal_mark_order_delivered(text, text, text) TO anon, authenticated;