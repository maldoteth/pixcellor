-- Table to log every AI sample generation (homepage VisionGenerator + LetsTalkPrompt vision flow)
CREATE TABLE IF NOT EXISTS public.ai_sample_generations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id text,
  source text NOT NULL DEFAULT 'vision_generator',
  brief text,
  image_url text,
  storage_path text,
  company text,
  contact_name text,
  email text,
  phone text,
  parent_id uuid REFERENCES public.ai_sample_generations(id) ON DELETE SET NULL,
  contact_id uuid,
  is_refinement boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_sample_generations_created_at ON public.ai_sample_generations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_sample_generations_email ON public.ai_sample_generations (lower(email));
CREATE INDEX IF NOT EXISTS idx_ai_sample_generations_visitor ON public.ai_sample_generations (visitor_id);

ALTER TABLE public.ai_sample_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ai sample generations"
  ON public.ai_sample_generations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role manages ai sample generations"
  ON public.ai_sample_generations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update portal_fetch_snapshot to include ai sample generations
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
    'sampleRequests', coalesce((
      SELECT jsonb_agg(to_jsonb(l) ORDER BY l.created_at DESC)
      FROM public.lets_talk_leads l
      WHERE l.source = 'free_sample_request'
    ), '[]'::jsonb),
    'aiSampleGenerations', coalesce((
      SELECT jsonb_agg(to_jsonb(g) ORDER BY g.created_at DESC)
      FROM public.ai_sample_generations g
    ), '[]'::jsonb),
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