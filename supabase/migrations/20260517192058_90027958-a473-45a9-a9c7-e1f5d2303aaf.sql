
-- 1. Link conversation -> contact
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS contact_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_contact_id
  ON public.chat_conversations(contact_id);

-- 2. Dedup lookup indexes
CREATE INDEX IF NOT EXISTS idx_contacts_email_lower
  ON public.contacts(lower(email));

CREATE INDEX IF NOT EXISTS idx_contacts_phone
  ON public.contacts(phone);

-- 3. merge_contacts() — admin-only RPC
CREATE OR REPLACE FUNCTION public.merge_contacts(
  survivor_id uuid,
  duplicate_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survivor public.contacts%ROWTYPE;
  v_dup public.contacts%ROWTYPE;
  v_id uuid;
  v_temp_rank int;
  v_merged_names text := '';
  v_status_rank jsonb := '{"archived":0,"cold":1,"aware":2,"warm":3,"hot":4,"gold":5}'::jsonb;
  v_new_status text;
  v_old_rank int;
  v_new_rank int;
BEGIN
  -- Auth: only admins
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  IF survivor_id IS NULL OR duplicate_ids IS NULL OR array_length(duplicate_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'survivor_id and at least one duplicate_id are required';
  END IF;

  IF array_length(duplicate_ids, 1) > 5 THEN
    RAISE EXCEPTION 'max 5 duplicates per merge';
  END IF;

  IF survivor_id = ANY(duplicate_ids) THEN
    RAISE EXCEPTION 'survivor_id cannot be in duplicate_ids';
  END IF;

  SELECT * INTO v_survivor FROM public.contacts WHERE id = survivor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'survivor not found'; END IF;

  v_new_status := v_survivor.status;

  FOREACH v_id IN ARRAY duplicate_ids LOOP
    SELECT * INTO v_dup FROM public.contacts WHERE id = v_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    -- Re-parent child rows
    UPDATE public.contact_events       SET contact_id = survivor_id WHERE contact_id = v_id;
    UPDATE public.contact_persons      SET contact_id = survivor_id WHERE contact_id = v_id;
    UPDATE public.chat_conversations   SET contact_id = survivor_id WHERE contact_id = v_id;
    UPDATE public.ai_sample_generations SET contact_id = survivor_id WHERE contact_id = v_id;

    -- Fill missing survivor fields from duplicate
    UPDATE public.contacts
       SET email               = COALESCE(v_survivor.email, v_dup.email),
           phone               = COALESCE(v_survivor.phone, v_dup.phone),
           location            = COALESCE(v_survivor.location, v_dup.location),
           website             = COALESCE(v_survivor.website, v_dup.website),
           actual_website_url  = COALESCE(v_survivor.actual_website_url, v_dup.actual_website_url),
           social_url          = COALESCE(v_survivor.social_url, v_dup.social_url),
           contact_name        = COALESCE(v_survivor.contact_name, v_dup.contact_name),
           source_url          = COALESCE(v_survivor.source_url, v_dup.source_url),
           source_platform     = COALESCE(v_survivor.source_platform, v_dup.source_platform),
           lead_score          = GREATEST(COALESCE(v_survivor.lead_score, 0), COALESCE(v_dup.lead_score, 0)),
           lead_score_reason   = COALESCE(v_survivor.lead_score_reason, v_dup.lead_score_reason),
           notes               = NULLIF(
                                    concat_ws(E'\n',
                                      NULLIF(v_survivor.notes, ''),
                                      NULLIF(v_dup.notes, '')
                                    ), ''
                                  ),
           updated_at          = now()
     WHERE id = survivor_id
     RETURNING * INTO v_survivor;

    -- Status: keep the warmer one
    v_old_rank := COALESCE((v_status_rank ->> v_new_status)::int, 1);
    v_new_rank := COALESCE((v_status_rank ->> v_dup.status)::int, 1);
    IF v_new_rank > v_old_rank THEN
      v_new_status := v_dup.status;
    END IF;

    v_merged_names := v_merged_names ||
      CASE WHEN v_merged_names = '' THEN '' ELSE ', ' END ||
      COALESCE(v_dup.name, v_dup.id::text);

    DELETE FROM public.contacts WHERE id = v_id;
  END LOOP;

  -- Apply best status + final note
  UPDATE public.contacts
     SET status     = v_new_status,
         notes      = NULLIF(
                        concat_ws(E'\n',
                          NULLIF(notes, ''),
                          'Merged duplicates on ' || to_char(now(), 'YYYY-MM-DD') || ': ' || v_merged_names
                        ), ''
                      ),
         updated_at = now()
   WHERE id = survivor_id;

  -- Audit event
  INSERT INTO public.contact_events (contact_id, title, description, event_type)
  VALUES (
    survivor_id,
    'Merged duplicates',
    'Merged ' || array_length(duplicate_ids, 1) || ' duplicate contact(s) into this record: ' || v_merged_names,
    'note'
  );

  RETURN jsonb_build_object(
    'survivor_id', survivor_id,
    'merged_count', array_length(duplicate_ids, 1),
    'merged_names', v_merged_names
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_contacts(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_contacts(uuid, uuid[]) TO authenticated, service_role;
