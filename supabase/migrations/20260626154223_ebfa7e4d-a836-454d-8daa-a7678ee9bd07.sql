CREATE OR REPLACE FUNCTION public.get_affiliate_public(_code TEXT)
RETURNS TABLE(code TEXT, share_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.code, a.share_name
  FROM public.affiliate_codes a
  WHERE a.code = upper(_code)
    AND a.active = true
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_affiliate_public(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affiliate_public(TEXT) TO anon, authenticated;