CREATE TABLE public.project_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  customer_email TEXT,
  site_name TEXT NOT NULL,
  site_contents TEXT NOT NULL,
  pages_details TEXT NOT NULL,
  colours_styles TEXT NOT NULL,
  reference_links TEXT,
  images_content_socials TEXT NOT NULL,
  extra_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT project_requirements_session_id_length CHECK (char_length(session_id) BETWEEN 8 AND 255),
  CONSTRAINT project_requirements_site_name_length CHECK (char_length(site_name) BETWEEN 1 AND 160),
  CONSTRAINT project_requirements_site_contents_length CHECK (char_length(site_contents) BETWEEN 1 AND 4000),
  CONSTRAINT project_requirements_pages_details_length CHECK (char_length(pages_details) BETWEEN 1 AND 6000),
  CONSTRAINT project_requirements_colours_styles_length CHECK (char_length(colours_styles) BETWEEN 1 AND 4000),
  CONSTRAINT project_requirements_reference_links_length CHECK (reference_links IS NULL OR char_length(reference_links) <= 4000),
  CONSTRAINT project_requirements_images_content_socials_length CHECK (char_length(images_content_socials) BETWEEN 1 AND 6000),
  CONSTRAINT project_requirements_extra_notes_length CHECK (extra_notes IS NULL OR char_length(extra_notes) <= 3000)
);

ALTER TABLE public.project_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read project requirements"
ON public.project_requirements
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Customers can submit project requirements"
ON public.project_requirements
FOR INSERT
TO anon, authenticated
WITH CHECK (
  session_id IS NOT NULL
  AND char_length(session_id) BETWEEN 8 AND 255
  AND EXISTS (
    SELECT 1
    FROM public.stripe_checkout_sessions s
    WHERE s.session_id = project_requirements.session_id
      AND (s.payment_status = 'paid' OR s.status IN ('complete', 'completed'))
  )
);

CREATE POLICY "Customers can update project requirements for paid orders"
ON public.project_requirements
FOR UPDATE
TO anon, authenticated
USING (
  session_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.stripe_checkout_sessions s
    WHERE s.session_id = project_requirements.session_id
      AND (s.payment_status = 'paid' OR s.status IN ('complete', 'completed'))
  )
)
WITH CHECK (
  session_id IS NOT NULL
  AND char_length(session_id) BETWEEN 8 AND 255
  AND EXISTS (
    SELECT 1
    FROM public.stripe_checkout_sessions s
    WHERE s.session_id = project_requirements.session_id
      AND (s.payment_status = 'paid' OR s.status IN ('complete', 'completed'))
  )
);

CREATE TRIGGER update_project_requirements_updated_at
BEFORE UPDATE ON public.project_requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.portal_fetch_snapshot(_access_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  PERFORM public.portal_require_access(_access_code);

  SELECT jsonb_build_object(
    'orders', coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC) FROM public.stripe_checkout_sessions s), '[]'::jsonb),
    'falloffs', coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.last_seen_at DESC) FROM public.visitor_falloffs f), '[]'::jsonb),
    'conversations', coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.updated_at DESC) FROM public.chat_conversations c), '[]'::jsonb),
    'messages', coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC) FROM public.chat_messages m), '[]'::jsonb),
    'profiles', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.updated_at DESC) FROM public.client_profiles p), '[]'::jsonb),
    'inquiries', coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC) FROM public.contact_inquiries i), '[]'::jsonb),
    'contacts', coalesce((SELECT jsonb_agg(to_jsonb(co) ORDER BY co.updated_at DESC) FROM public.contacts co), '[]'::jsonb),
    'contactEvents', coalesce((SELECT jsonb_agg(to_jsonb(ce) ORDER BY ce.created_at DESC) FROM public.contact_events ce), '[]'::jsonb),
    'projectRequirements', coalesce((SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.updated_at DESC) FROM public.project_requirements pr), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;