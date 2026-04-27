ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'cold';

CREATE OR REPLACE FUNCTION public.portal_update_contact_status(_access_code text, _contact_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_status text := lower(trim(coalesce(_status, '')));
BEGIN
  PERFORM public.portal_require_access(_access_code);

  IF clean_status NOT IN ('cold', 'aware', 'warm', 'hot') THEN
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

GRANT EXECUTE ON FUNCTION public.portal_update_contact_status(text, uuid, text) TO anon, authenticated;