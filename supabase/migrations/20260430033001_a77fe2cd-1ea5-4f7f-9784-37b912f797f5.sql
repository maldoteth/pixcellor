ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
ADD COLUMN IF NOT EXISTS created_by_email text;

DROP FUNCTION IF EXISTS public.portal_create_contact(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.portal_create_contact_event(uuid, text, text, timestamp with time zone);

CREATE FUNCTION public.portal_create_contact(_name text, _phone text DEFAULT NULL::text, _email text DEFAULT NULL::text, _location text DEFAULT NULL::text, _notes text DEFAULT NULL::text)
RETURNS jsonb
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
  admin_email text;
  new_contact public.contacts%rowtype;
BEGIN
  PERFORM public.portal_require_admin();

  SELECT lower(email)
  INTO admin_email
  FROM auth.users
  WHERE id = auth.uid()
  LIMIT 1;

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

  INSERT INTO public.contacts (name, phone, email, location, notes, source, created_by_user_id, created_by_email)
  VALUES (clean_name, clean_phone, clean_email, clean_location, clean_notes, 'manual', auth.uid(), admin_email)
  RETURNING * INTO new_contact;

  RETURN to_jsonb(new_contact);
END;
$$;

CREATE FUNCTION public.portal_create_contact_event(_contact_id uuid, _title text, _description text DEFAULT NULL::text, _callback_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  clean_title text := nullif(trim(_title), '');
  clean_description text := nullif(trim(coalesce(_description, '')), '');
  admin_email text;
  new_event public.contact_events%rowtype;
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
  VALUES (_contact_id, clean_title, clean_description, CASE WHEN _callback_at IS NULL THEN 'communication' ELSE 'callback' END, _callback_at, auth.uid(), admin_email)
  RETURNING * INTO new_event;

  RETURN to_jsonb(new_event);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.portal_create_contact(text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_create_contact_event(uuid, text, text, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_create_contact(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_create_contact_event(uuid, text, text, timestamp with time zone) TO authenticated;