CREATE OR REPLACE FUNCTION public.portal_update_contact(
  _access_code text,
  _contact_id uuid,
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

GRANT EXECUTE ON FUNCTION public.portal_update_contact(text, uuid, text, text, text, text, text) TO anon, authenticated;