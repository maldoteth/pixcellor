ALTER TABLE public.stripe_checkout_sessions
ADD COLUMN IF NOT EXISTS delivered_domain TEXT;

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
    'contactEvents', coalesce((SELECT jsonb_agg(to_jsonb(ce) ORDER BY ce.created_at DESC) FROM public.contact_events ce), '[]'::jsonb),
    'projectRequirements', coalesce((SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.updated_at DESC) FROM public.project_requirements pr), '[]'::jsonb),
    'emailLogs', coalesce((
      SELECT jsonb_agg(to_jsonb(latest) ORDER BY latest.created_at DESC)
      FROM (
        SELECT DISTINCT ON (message_id)
          message_id,
          template_name,
          recipient_email,
          status,
          error_message,
          metadata,
          created_at
        FROM public.email_send_log
        WHERE message_id IS NOT NULL
          AND template_name IN (
            'full-works-order-confirmation',
            'elite-order-confirmation',
            'retainer-order-confirmation',
            'project-requirements-reminder',
            'full-works-order-complete',
            'elite-order-complete',
            'retainer-order-complete'
          )
        ORDER BY message_id, created_at DESC
      ) latest
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;