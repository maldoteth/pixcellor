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

  IF clean_status NOT IN ('cold', 'aware', 'warm', 'hot', 'gold', 'archived') THEN
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