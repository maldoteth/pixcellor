ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.portal_update_contact_media(_contact_id uuid, _media jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb;
  url text;
  cleaned jsonb := '[]'::jsonb;
BEGIN
  PERFORM public.portal_require_admin();

  IF _media IS NULL OR jsonb_typeof(_media) <> 'array' THEN
    RAISE EXCEPTION 'Media must be an array';
  END IF;

  IF jsonb_array_length(_media) > 50 THEN
    RAISE EXCEPTION 'You can only store up to 50 media items per client';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(_media) LOOP
    IF jsonb_typeof(item) = 'string' THEN
      url := item #>> '{}';
    ELSIF jsonb_typeof(item) = 'object' THEN
      url := item ->> 'url';
    ELSE
      RAISE EXCEPTION 'Invalid media entry';
    END IF;

    IF url IS NULL OR length(url) < 8 OR length(url) > 1000 OR url !~* '^https?://' THEN
      RAISE EXCEPTION 'Each media item must be a valid URL';
    END IF;

    cleaned := cleaned || to_jsonb(url);
  END LOOP;

  UPDATE public.contacts
  SET media = cleaned, updated_at = now()
  WHERE id = _contact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;
END;
$function$;