DROP FUNCTION IF EXISTS public.portal_mark_order_delivered(text, text);

CREATE OR REPLACE FUNCTION public.portal_require_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '28000';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_fetch_messages(_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.portal_require_admin();
  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at ASC)
    FROM public.chat_messages m
    WHERE m.conversation_id = _conversation_id
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_complete_callback(_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.portal_require_admin();
  UPDATE public.contact_events
  SET completed_at = now(), updated_at = now()
  WHERE id = _event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_create_contact_event(_contact_id uuid, _title text, _description text DEFAULT NULL::text, _callback_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  clean_title text := nullif(trim(_title), '');
  clean_description text := nullif(trim(coalesce(_description, '')), '');
BEGIN
  PERFORM public.portal_require_admin();

  IF NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = _contact_id) THEN
    RAISE EXCEPTION 'Select a valid contact';
  END IF;
  IF clean_title IS NULL OR length(clean_title) > 160 THEN
    RAISE EXCEPTION 'Event title is required and must be 160 characters or fewer';
  END IF;
  IF clean_description IS NOT NULL AND length(clean_description) > 2000 THEN
    RAISE EXCEPTION 'Event description must be 2000 characters or fewer';
  END IF;

  INSERT INTO public.contact_events (contact_id, title, description, event_type, callback_at)
  VALUES (_contact_id, clean_title, clean_description, CASE WHEN _callback_at IS NULL THEN 'communication' ELSE 'callback' END, _callback_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_update_contact_status(_contact_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  clean_status text := lower(trim(coalesce(_status, '')));
BEGIN
  PERFORM public.portal_require_admin();

  IF clean_status NOT IN ('cold', 'aware', 'warm', 'hot', 'gold') THEN
    RAISE EXCEPTION 'Choose a valid contact status';
  END IF;

  UPDATE public.contacts
  SET status = clean_status,
      updated_at = now()
  WHERE id = _contact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_create_contact(_name text, _phone text DEFAULT NULL::text, _email text DEFAULT NULL::text, _location text DEFAULT NULL::text, _notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  clean_name text := nullif(trim(_name), '');
  clean_phone text := nullif(trim(coalesce(_phone, '')), '');
  clean_email text := nullif(trim(coalesce(_email, '')), '');
  clean_location text := nullif(trim(coalesce(_location, '')), '');
  clean_notes text := nullif(trim(coalesce(_notes, '')), '');
BEGIN
  PERFORM public.portal_require_admin();

  IF clean_name IS NULL OR length(clean_name) > 100 THEN
    RAISE EXCEPTION 'Contact name is required and must be 100 characters or fewer';
  END IF;
  IF clean_phone IS NOT NULL AND length(clean_phone) > 40 THEN
    RAISE EXCEPTION 'Phone number must be 40 characters or fewer';
  END IF;
  IF clean_email IS NOT NULL AND (length(clean_email) > 255 OR clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$') THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;
  IF clean_location IS NOT NULL AND length(clean_location) > 160 THEN
    RAISE EXCEPTION 'Location must be 160 characters or fewer';
  END IF;
  IF clean_notes IS NOT NULL AND length(clean_notes) > 1000 THEN
    RAISE EXCEPTION 'Notes must be 1000 characters or fewer';
  END IF;

  INSERT INTO public.contacts (name, phone, email, location, notes, source)
  VALUES (clean_name, clean_phone, clean_email, clean_location, clean_notes, 'manual');
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_close_chat_case(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.portal_require_admin();

  UPDATE public.chat_conversations
  SET bot_paused = false,
      manual_handoff_at = null,
      updated_at = now()
  WHERE id = _conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_send_chat_reply(_conversation_id uuid, _content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  clean_content text := nullif(trim(_content), '');
BEGIN
  PERFORM public.portal_require_admin();

  IF clean_content IS NULL OR length(clean_content) > 2000 THEN
    RAISE EXCEPTION 'Reply is required and must be 2000 characters or fewer';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.chat_conversations WHERE id = _conversation_id) THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  INSERT INTO public.chat_messages (conversation_id, role, content)
  VALUES (_conversation_id, 'admin', clean_content);

  UPDATE public.chat_conversations
  SET bot_paused = true,
      manual_handoff_at = coalesce(manual_handoff_at, now()),
      updated_at = now()
  WHERE id = _conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_update_contact(_contact_id uuid, _name text, _phone text DEFAULT NULL::text, _email text DEFAULT NULL::text, _location text DEFAULT NULL::text, _notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  clean_name text := nullif(trim(_name), '');
  clean_phone text := nullif(trim(coalesce(_phone, '')), '');
  clean_email text := nullif(trim(coalesce(_email, '')), '');
  clean_location text := nullif(trim(coalesce(_location, '')), '');
  clean_notes text := nullif(trim(coalesce(_notes, '')), '');
BEGIN
  PERFORM public.portal_require_admin();

  IF clean_name IS NULL OR length(clean_name) > 100 THEN
    RAISE EXCEPTION 'Contact name is required and must be 100 characters or fewer';
  END IF;
  IF clean_phone IS NOT NULL AND length(clean_phone) > 40 THEN
    RAISE EXCEPTION 'Phone number must be 40 characters or fewer';
  END IF;
  IF clean_email IS NOT NULL AND (length(clean_email) > 255 OR clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$') THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;
  IF clean_location IS NOT NULL AND length(clean_location) > 160 THEN
    RAISE EXCEPTION 'Location must be 160 characters or fewer';
  END IF;
  IF clean_notes IS NOT NULL AND length(clean_notes) > 1000 THEN
    RAISE EXCEPTION 'Notes must be 1000 characters or fewer';
  END IF;

  UPDATE public.contacts
  SET name = clean_name,
      phone = clean_phone,
      email = clean_email,
      location = clean_location,
      notes = clean_notes,
      updated_at = now()
  WHERE id = _contact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_mark_order_delivered(_session_id text, _delivered_domain text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  clean_domain text := lower(trim(coalesce(_delivered_domain, '')));
BEGIN
  PERFORM public.portal_require_admin();

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
$$;

CREATE OR REPLACE FUNCTION public.portal_mark_order_undelivered(_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.portal_require_admin();

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
$$;

CREATE OR REPLACE FUNCTION public.portal_fetch_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.portal_require_access(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.portal_fetch_snapshot(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.portal_fetch_messages(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.portal_create_contact(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.portal_update_contact(text, uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.portal_create_contact_event(text, uuid, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.portal_complete_callback(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.portal_update_contact_status(text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.portal_send_chat_reply(text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.portal_close_chat_case(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.portal_mark_order_delivered(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.portal_mark_order_undelivered(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.portal_require_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_fetch_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_fetch_messages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_create_contact(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_update_contact(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_create_contact_event(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_complete_callback(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_update_contact_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_send_chat_reply(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_close_chat_case(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_mark_order_delivered(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_mark_order_undelivered(text) TO authenticated;