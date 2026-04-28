CREATE TABLE public.visitor_falloffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  consent_status text NOT NULL DEFAULT 'granted',
  first_page text,
  last_page text,
  referrer text,
  user_agent text,
  browser_language text,
  timezone text,
  screen_size text,
  viewport_size text,
  checkout_session_id text,
  package_name text,
  billing text,
  price_id text,
  customer_email text,
  checkout_started_at timestamp with time zone,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  event_count integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (visitor_id, session_id)
);

ALTER TABLE public.visitor_falloffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visitors can create consented falloff records"
ON public.visitor_falloffs
FOR INSERT
TO anon, authenticated
WITH CHECK (
  consent_status = 'granted'
  AND visitor_id IS NOT NULL
  AND session_id IS NOT NULL
  AND length(visitor_id) BETWEEN 8 AND 200
  AND length(session_id) BETWEEN 8 AND 200
);

CREATE POLICY "Visitors can update own consented falloff records"
ON public.visitor_falloffs
FOR UPDATE
TO anon, authenticated
USING (
  consent_status = 'granted'
  AND visitor_id IS NOT NULL
  AND session_id IS NOT NULL
)
WITH CHECK (
  consent_status = 'granted'
  AND visitor_id IS NOT NULL
  AND session_id IS NOT NULL
  AND length(visitor_id) BETWEEN 8 AND 200
  AND length(session_id) BETWEEN 8 AND 200
);

CREATE POLICY "Admins read visitor falloffs"
ON public.visitor_falloffs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_visitor_falloffs_updated_at
BEFORE UPDATE ON public.visitor_falloffs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_visitor_falloffs_last_seen_at ON public.visitor_falloffs (last_seen_at DESC);
CREATE INDEX idx_visitor_falloffs_customer_email ON public.visitor_falloffs (customer_email);
CREATE INDEX idx_visitor_falloffs_checkout_session_id ON public.visitor_falloffs (checkout_session_id);

CREATE OR REPLACE FUNCTION public.portal_fetch_snapshot(_access_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  PERFORM public.portal_require_access(_access_code);

  SELECT jsonb_build_object(
    'orders', coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC) FROM public.stripe_checkout_sessions s), '[]'::jsonb),
    'falloffs', coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.last_seen_at DESC) FROM public.visitor_falloffs f), '[]'::jsonb),
    'conversations', coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.updated_at DESC) FROM public.chat_conversations c), '[]'::jsonb),
    'messages', coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC) FROM public.chat_messages m), '[]'::jsonb),
    'profiles', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.updated_at DESC) FROM public.client_profiles p), '[]'::jsonb),
    'inquiries', coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC) FROM public.contact_inquiries i), '[]'::jsonb),
    'contacts', coalesce((SELECT jsonb_agg(to_jsonb(co) ORDER BY co.updated_at DESC) FROM public.contacts co), '[]'::jsonb),
    'contactEvents', coalesce((SELECT jsonb_agg(to_jsonb(ce) ORDER BY ce.created_at DESC) FROM public.contact_events ce), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.portal_fetch_snapshot(text) TO anon, authenticated;