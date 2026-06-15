ALTER TABLE public.login_handoffs
ADD COLUMN IF NOT EXISTS login_url text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_handoffs TO service_role;

CREATE OR REPLACE FUNCTION public.claim_login_handoff(_sid text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.login_handoffs%ROWTYPE;
BEGIN
  IF _sid IS NULL OR length(_sid) < 16 OR length(_sid) > 128 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO row FROM public.login_handoffs WHERE id = _sid LIMIT 1;
  IF NOT FOUND OR (row.token IS NULL AND row.login_url IS NULL) THEN
    RETURN NULL;
  END IF;
  IF row.expires_at IS NOT NULL AND row.expires_at < now() THEN
    DELETE FROM public.login_handoffs WHERE id = _sid;
    RETURN NULL;
  END IF;
  IF row.claimed_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.login_handoffs SET claimed_at = now() WHERE id = _sid;
  RETURN jsonb_strip_nulls(jsonb_build_object('token', row.token, 'login_url', row.login_url));
END;
$$;

REVOKE ALL ON FUNCTION public.claim_login_handoff(text) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_login_handoff(text) TO anon;
GRANT EXECUTE ON FUNCTION public.claim_login_handoff(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_login_handoff(text) TO service_role;