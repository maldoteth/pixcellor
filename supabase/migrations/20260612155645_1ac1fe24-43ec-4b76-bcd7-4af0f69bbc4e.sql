
-- 1. Set search_path on 6 functions missing it
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public._times_overlap(time, time, time, time) SET search_path = public;
ALTER FUNCTION public.haversine_km(double precision, double precision, double precision, double precision) SET search_path = public;

-- 2. Lock down SECURITY DEFINER functions: revoke PUBLIC/anon, grant authenticated + service_role.
-- Then re-grant anon only on the handful of helpers that genuinely need unauthenticated access.
DO $$
DECLARE
  fn record;
  ident text;
  -- functions that must remain callable by anon (public-facing flows)
  anon_allow text[] := ARRAY[
    'claim_login_handoff(text)',
    'ensure_order_public_reference(text)',
    'fetch_chat_history(text)',
    'get_vision_preview_by_slug(text)',
    'vacancy_invitation_respond(text, text)'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    ident := format('public.%I(%s)', fn.proname, fn.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', ident);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', ident);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', ident);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', ident);

    IF (fn.proname || '(' || fn.args || ')') = ANY (anon_allow) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', ident);
    END IF;
  END LOOP;
END $$;
