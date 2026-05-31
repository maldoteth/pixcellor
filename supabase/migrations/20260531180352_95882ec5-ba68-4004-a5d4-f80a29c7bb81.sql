DROP FUNCTION IF EXISTS public.partner_source_for(uuid);

REVOKE ALL ON FUNCTION public.customer_lead_source_for(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.customer_lead_source_for(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.customer_lead_source_for(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.customer_fetch_portal() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.customer_fetch_portal() FROM anon;
GRANT EXECUTE ON FUNCTION public.customer_fetch_portal() TO authenticated;