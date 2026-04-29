ALTER TABLE public.contact_events
ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
ADD COLUMN IF NOT EXISTS created_by_email text;

CREATE INDEX IF NOT EXISTS idx_contact_events_created_by_user_id
ON public.contact_events(created_by_user_id);

CREATE OR REPLACE FUNCTION public.portal_fetch_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  PERFORM public.portal_require_admin();

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
    'editRequests', coalesce((SELECT jsonb_agg(to_jsonb(er) ORDER BY er.created_at DESC) FROM public.edit_requests er), '[]'::jsonb),
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
            'order-complete',
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

CREATE OR REPLACE FUNCTION public.portal_create_contact_event(_contact_id uuid, _title text, _description text DEFAULT NULL::text, _callback_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  clean_title text := nullif(trim(_title), '');
  clean_description text := nullif(trim(coalesce(_description, '')), '');
  admin_email text;
BEGIN
  PERFORM public.portal_require_admin();

  SELECT lower(email)
  INTO admin_email
  FROM auth.users
  WHERE id = auth.uid()
  LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = _contact_id) THEN
    RAISE EXCEPTION 'Select a valid contact';
  END IF;
  IF clean_title IS NULL OR length(clean_title) > 160 THEN
    RAISE EXCEPTION 'Event title is required and must be 160 characters or fewer';
  END IF;
  IF clean_description IS NOT NULL AND length(clean_description) > 2000 THEN
    RAISE EXCEPTION 'Event description must be 2000 characters or fewer';
  END IF;

  INSERT INTO public.contact_events (contact_id, title, description, event_type, callback_at, created_by_user_id, created_by_email)
  VALUES (_contact_id, clean_title, clean_description, CASE WHEN _callback_at IS NULL THEN 'communication' ELSE 'callback' END, _callback_at, auth.uid(), admin_email);
END;
$function$;