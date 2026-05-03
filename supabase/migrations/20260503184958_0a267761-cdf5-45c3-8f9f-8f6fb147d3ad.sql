
CREATE TABLE IF NOT EXISTS public.contact_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  name text NOT NULL,
  job_title text,
  phone text,
  email text,
  created_by_user_id uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_persons_contact_id ON public.contact_persons(contact_id);

ALTER TABLE public.contact_persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage contact persons" ON public.contact_persons;
CREATE POLICY "Admins manage contact persons"
ON public.contact_persons
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_contact_persons_updated_at ON public.contact_persons;
CREATE TRIGGER trg_contact_persons_updated_at
BEFORE UPDATE ON public.contact_persons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.portal_add_contact_person(
  _contact_id uuid,
  _name text,
  _job_title text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_name text := nullif(trim(_name), '');
  clean_job text := nullif(trim(coalesce(_job_title, '')), '');
  clean_phone text := nullif(trim(coalesce(_phone, '')), '');
  clean_email text := nullif(trim(coalesce(_email, '')), '');
  admin_email text;
  new_person public.contact_persons%rowtype;
BEGIN
  PERFORM public.portal_require_admin();

  SELECT lower(email) INTO admin_email FROM auth.users WHERE id = auth.uid() LIMIT 1;

  IF clean_name IS NULL OR length(clean_name) > 100 THEN
    RAISE EXCEPTION 'Contact name is required and must be 100 characters or fewer';
  END IF;
  IF clean_job IS NOT NULL AND length(clean_job) > 160 THEN
    RAISE EXCEPTION 'Job title must be 160 characters or fewer';
  END IF;
  IF clean_phone IS NOT NULL AND length(clean_phone) > 40 THEN
    RAISE EXCEPTION 'Phone must be 40 characters or fewer';
  END IF;
  IF clean_email IS NOT NULL AND (length(clean_email) > 255 OR clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$') THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.contacts WHERE id = _contact_id) THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  INSERT INTO public.contact_persons (contact_id, name, job_title, phone, email, created_by_user_id, created_by_email)
  VALUES (_contact_id, clean_name, clean_job, clean_phone, clean_email, auth.uid(), admin_email)
  RETURNING * INTO new_person;

  RETURN to_jsonb(new_person);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_delete_contact_person(_person_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.portal_require_admin();
  DELETE FROM public.contact_persons WHERE id = _person_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_fetch_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'contactPersons', coalesce((SELECT jsonb_agg(to_jsonb(cp) ORDER BY cp.created_at DESC) FROM public.contact_persons cp), '[]'::jsonb),
    'projectRequirements', coalesce((SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.updated_at DESC) FROM public.project_requirements pr), '[]'::jsonb),
    'editRequests', coalesce((SELECT jsonb_agg(to_jsonb(er) ORDER BY er.created_at DESC) FROM public.edit_requests er), '[]'::jsonb),
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
            'order-complete',
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
$function$;
