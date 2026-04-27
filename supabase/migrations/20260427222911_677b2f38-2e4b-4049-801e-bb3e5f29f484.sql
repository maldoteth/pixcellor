CREATE OR REPLACE FUNCTION public.portal_require_access(_access_code text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(_access_code, '') <> '42069' THEN
    RAISE EXCEPTION 'Invalid portal access code' USING ERRCODE = '28000';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_fetch_snapshot(_access_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  PERFORM public.portal_require_access(_access_code);

  SELECT jsonb_build_object(
    'orders', coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC) FROM public.stripe_checkout_sessions s), '[]'::jsonb),
    'conversations', coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.updated_at DESC) FROM public.chat_conversations c), '[]'::jsonb),
    'messages', coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC) FROM public.chat_messages m), '[]'::jsonb),
    'profiles', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.updated_at DESC) FROM public.client_profiles p), '[]'::jsonb),
    'inquiries', coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC) FROM public.contact_inquiries i), '[]'::jsonb),
    'contacts', coalesce((SELECT jsonb_agg(to_jsonb(co) ORDER BY co.updated_at DESC) FROM public.contacts co), '[]'::jsonb),
    'contactEvents', coalesce((SELECT jsonb_agg(to_jsonb(ce) ORDER BY ce.created_at DESC) FROM public.contact_events ce), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_fetch_messages(_access_code text, _conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.portal_require_access(_access_code);
  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at ASC)
    FROM public.chat_messages m
    WHERE m.conversation_id = _conversation_id
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_create_contact(
  _access_code text,
  _name text,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL,
  _location text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_name text := nullif(trim(_name), '');
  clean_phone text := nullif(trim(coalesce(_phone, '')), '');
  clean_email text := nullif(trim(coalesce(_email, '')), '');
  clean_location text := nullif(trim(coalesce(_location, '')), '');
  clean_notes text := nullif(trim(coalesce(_notes, '')), '');
BEGIN
  PERFORM public.portal_require_access(_access_code);

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

CREATE OR REPLACE FUNCTION public.portal_create_contact_event(
  _access_code text,
  _contact_id uuid,
  _title text,
  _description text DEFAULT NULL,
  _callback_at timestamp with time zone DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_title text := nullif(trim(_title), '');
  clean_description text := nullif(trim(coalesce(_description, '')), '');
BEGIN
  PERFORM public.portal_require_access(_access_code);

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

CREATE OR REPLACE FUNCTION public.portal_complete_callback(_access_code text, _event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.portal_require_access(_access_code);
  UPDATE public.contact_events
  SET completed_at = now(), updated_at = now()
  WHERE id = _event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_fetch_snapshot(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_fetch_messages(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_create_contact(text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_create_contact_event(text, uuid, text, text, timestamp with time zone) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_complete_callback(text, uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_require_access(text) FROM PUBLIC;