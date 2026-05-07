CREATE OR REPLACE FUNCTION public.portal_create_contact(_name text, _phone text DEFAULT NULL::text, _email text DEFAULT NULL::text, _location text DEFAULT NULL::text, _notes text DEFAULT NULL::text, _industry text DEFAULT 'general'::text, _website text DEFAULT NULL::text, _contact_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  clean_name text := nullif(trim(_name), '');
  clean_contact_name text := nullif(trim(coalesce(_contact_name, '')), '');
  clean_phone text := nullif(trim(coalesce(_phone, '')), '');
  clean_email text := lower(nullif(trim(coalesce(_email, '')), ''));
  clean_location text := nullif(trim(coalesce(_location, '')), '');
  clean_notes text := nullif(trim(coalesce(_notes, '')), '');
  clean_industry text := lower(nullif(trim(coalesce(_industry, 'general')), ''));
  clean_website text := nullif(trim(coalesce(_website, '')), '');
  normalized_phone text;
  admin_email text;
  new_contact public.contacts%rowtype;
  existing_id uuid;
BEGIN
  PERFORM public.portal_require_admin();

  SELECT lower(email) INTO admin_email FROM auth.users WHERE id = auth.uid() LIMIT 1;

  IF clean_name IS NULL OR length(clean_name) > 100 THEN
    RAISE EXCEPTION 'Company name is required and must be 100 characters or fewer';
  END IF;
  IF clean_contact_name IS NOT NULL AND length(clean_contact_name) > 100 THEN
    RAISE EXCEPTION 'Contact name must be 100 characters or fewer';
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
    RAISE EXCEPTION 'Job title must be 1000 characters or fewer';
  END IF;
  IF clean_industry IS NULL THEN
    clean_industry := 'general';
  END IF;
  IF length(clean_industry) > 80 THEN
    RAISE EXCEPTION 'Industry must be 80 characters or fewer';
  END IF;
  IF clean_website IS NOT NULL AND length(clean_website) > 500 THEN
    RAISE EXCEPTION 'Website/source link must be 500 characters or fewer';
  END IF;

  normalized_phone := nullif(regexp_replace(coalesce(clean_phone, ''), '[^0-9+]', '', 'g'), '');

  IF clean_email IS NOT NULL THEN
    SELECT id INTO existing_id FROM public.contacts
    WHERE lower(email) = clean_email LIMIT 1;
    IF existing_id IS NOT NULL THEN
      RAISE EXCEPTION 'A client with this email already exists';
    END IF;
  END IF;

  IF normalized_phone IS NOT NULL AND length(normalized_phone) >= 5 THEN
    SELECT id INTO existing_id FROM public.contacts
    WHERE regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g') = normalized_phone LIMIT 1;
    IF existing_id IS NOT NULL THEN
      RAISE EXCEPTION 'A client with this phone number already exists';
    END IF;
  END IF;

  INSERT INTO public.contacts (name, contact_name, phone, email, location, notes, industry, website, source, created_by_user_id, created_by_email)
  VALUES (clean_name, clean_contact_name, clean_phone, clean_email, clean_location, clean_notes, clean_industry, clean_website, 'manual', auth.uid(), admin_email)
  RETURNING * INTO new_contact;

  RETURN to_jsonb(new_contact);
END;
$function$;