ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS industry text NOT NULL DEFAULT 'general';

UPDATE public.contacts
SET industry = CASE
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '') || ' ' || coalesce(source, '')) ~ '(electrician|electrical|roofer|roofing|plumber|plumbing|builder|building|construction|carpenter|joiner|decorator|painter|landscap|driveway|window|glazing|heating|gas engineer|tiler|flooring|brick|scaffold|bathroom|kitchen fitter)' THEN 'construction'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(restaurant|cafe|bar|pub|hotel|catering|takeaway|hospitality)' THEN 'hospitality'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(salon|barber|beauty|spa|aesthetic|nail|hair)' THEN 'beauty'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(gym|fitness|personal trainer|physio|clinic|health|dentist|medical)' THEN 'healthcare'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(estate agent|property|letting|mortgage|real estate)' THEN 'property'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(accountant|solicitor|lawyer|consultant|finance|insurance)' THEN 'professional services'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(shop|retail|boutique|ecommerce|e-commerce|store)' THEN 'retail'
  WHEN lower(coalesce(notes, '') || ' ' || coalesce(name, '')) ~ '(mechanic|garage|mot|vehicle|car dealer|automotive)' THEN 'automotive'
  ELSE 'general'
END
WHERE industry = 'general' OR industry IS NULL;

CREATE OR REPLACE FUNCTION public.portal_create_contact(_name text, _phone text DEFAULT NULL::text, _email text DEFAULT NULL::text, _location text DEFAULT NULL::text, _notes text DEFAULT NULL::text, _industry text DEFAULT 'general'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clean_name text := nullif(trim(_name), '');
  clean_phone text := nullif(trim(coalesce(_phone, '')), '');
  clean_email text := nullif(trim(coalesce(_email, '')), '');
  clean_location text := nullif(trim(coalesce(_location, '')), '');
  clean_notes text := nullif(trim(coalesce(_notes, '')), '');
  clean_industry text := lower(nullif(trim(coalesce(_industry, 'general')), ''));
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
  IF clean_industry IS NULL THEN
    clean_industry := 'general';
  END IF;
  IF length(clean_industry) > 80 THEN
    RAISE EXCEPTION 'Industry must be 80 characters or fewer';
  END IF;

  INSERT INTO public.contacts (name, phone, email, location, notes, industry, source, created_by_user_id, created_by_email)
  VALUES (clean_name, clean_phone, clean_email, clean_location, clean_notes, clean_industry, 'manual', auth.uid(), admin_email)
  RETURNING * INTO new_contact;

  RETURN to_jsonb(new_contact);
END;
$function$;

CREATE OR REPLACE FUNCTION public.portal_update_contact(_contact_id uuid, _name text, _phone text DEFAULT NULL::text, _email text DEFAULT NULL::text, _location text DEFAULT NULL::text, _notes text DEFAULT NULL::text, _industry text DEFAULT 'general'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clean_name text := nullif(trim(_name), '');
  clean_phone text := nullif(trim(coalesce(_phone, '')), '');
  clean_email text := nullif(trim(coalesce(_email, '')), '');
  clean_location text := nullif(trim(coalesce(_location, '')), '');
  clean_notes text := nullif(trim(coalesce(_notes, '')), '');
  clean_industry text := lower(nullif(trim(coalesce(_industry, 'general')), ''));
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
  IF clean_industry IS NULL THEN
    clean_industry := 'general';
  END IF;
  IF length(clean_industry) > 80 THEN
    RAISE EXCEPTION 'Industry must be 80 characters or fewer';
  END IF;

  UPDATE public.contacts
  SET name = clean_name,
      phone = clean_phone,
      email = clean_email,
      location = clean_location,
      notes = clean_notes,
      industry = clean_industry,
      updated_at = now()
  WHERE id = _contact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.portal_create_contact(text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_update_contact(uuid, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_create_contact(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_update_contact(uuid, text, text, text, text, text, text) TO authenticated;
