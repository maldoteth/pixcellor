CREATE OR REPLACE FUNCTION public.customer_fetch_portal()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_email text;
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '28000';
  END IF;

  SELECT lower(email)
  INTO user_email
  FROM auth.users
  WHERE id = auth.uid()
  LIMIT 1;

  IF user_email IS NULL OR user_email = '' THEN
    RAISE EXCEPTION 'Account email required' USING ERRCODE = '28000';
  END IF;

  SELECT jsonb_build_object(
    'email', user_email,
    'orders', coalesce((
      SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC)
      FROM public.stripe_checkout_sessions s
      WHERE lower(coalesce(s.customer_email, '')) = user_email
    ), '[]'::jsonb),
    'projectRequirements', coalesce((
      SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.updated_at DESC)
      FROM public.project_requirements pr
      WHERE EXISTS (
        SELECT 1
        FROM public.stripe_checkout_sessions s
        WHERE s.session_id = pr.session_id
          AND lower(coalesce(s.customer_email, '')) = user_email
      )
    ), '[]'::jsonb),
    'sampleRequests', coalesce((
      SELECT jsonb_agg(to_jsonb(l) ORDER BY l.created_at DESC)
      FROM public.lets_talk_leads l
      WHERE lower(coalesce(l.email, '')) = user_email
    ), '[]'::jsonb),
    'visionPreviews', coalesce((
      SELECT jsonb_agg(to_jsonb(v) ORDER BY v.created_at DESC)
      FROM public.vision_previews v
      WHERE lower(coalesce(v.client_email, '')) = user_email
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;