-- Update portal_fetch_snapshot to support a row limit + total counts
CREATE OR REPLACE FUNCTION public.portal_fetch_snapshot(_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  lim integer := GREATEST(1, LEAST(coalesce(_limit, 10), 500));
BEGIN
  PERFORM public.portal_require_admin();

  SELECT jsonb_build_object(
    'orders', coalesce((SELECT jsonb_agg(to_jsonb(s)) FROM (SELECT * FROM public.stripe_checkout_sessions ORDER BY created_at DESC LIMIT lim) s), '[]'::jsonb),
    'falloffs', coalesce((SELECT jsonb_agg(to_jsonb(f)) FROM (SELECT * FROM public.visitor_falloffs ORDER BY last_seen_at DESC LIMIT lim) f), '[]'::jsonb),
    'conversations', coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM (SELECT * FROM public.chat_conversations ORDER BY updated_at DESC LIMIT lim) c), '[]'::jsonb),
    'messages', coalesce((SELECT jsonb_agg(to_jsonb(m)) FROM (
        SELECT m.* FROM public.chat_messages m
        WHERE m.conversation_id IN (SELECT id FROM public.chat_conversations ORDER BY updated_at DESC LIMIT lim)
        ORDER BY m.created_at DESC
      ) m), '[]'::jsonb),
    'profiles', coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM (SELECT * FROM public.client_profiles ORDER BY updated_at DESC LIMIT lim) p), '[]'::jsonb),
    'inquiries', coalesce((SELECT jsonb_agg(to_jsonb(i)) FROM (SELECT * FROM public.contact_inquiries ORDER BY created_at DESC LIMIT lim) i), '[]'::jsonb),
    'contacts', coalesce((SELECT jsonb_agg(to_jsonb(co)) FROM (SELECT * FROM public.contacts ORDER BY updated_at DESC LIMIT lim) co), '[]'::jsonb),
    'contactEvents', coalesce((SELECT jsonb_agg(to_jsonb(ce)) FROM (SELECT * FROM public.contact_events ORDER BY created_at DESC LIMIT lim) ce), '[]'::jsonb),
    'contactPersons', coalesce((SELECT jsonb_agg(to_jsonb(cp)) FROM (SELECT * FROM public.contact_persons ORDER BY created_at DESC LIMIT lim) cp), '[]'::jsonb),
    'projectRequirements', coalesce((SELECT jsonb_agg(to_jsonb(pr)) FROM (SELECT * FROM public.project_requirements ORDER BY updated_at DESC LIMIT lim) pr), '[]'::jsonb),
    'editRequests', coalesce((SELECT jsonb_agg(to_jsonb(er)) FROM (SELECT * FROM public.edit_requests ORDER BY created_at DESC LIMIT lim) er), '[]'::jsonb),
    'sampleRequests', coalesce((
      SELECT jsonb_agg(to_jsonb(l)) FROM (
        SELECT * FROM public.lets_talk_leads WHERE source = 'free_sample_request'
        ORDER BY created_at DESC LIMIT lim
      ) l
    ), '[]'::jsonb),
    'aiSampleGenerations', coalesce((
      SELECT jsonb_agg(to_jsonb(g)) FROM (
        SELECT * FROM public.ai_sample_generations ORDER BY created_at DESC LIMIT lim
      ) g
    ), '[]'::jsonb),
    'emailLogs', coalesce((
      SELECT jsonb_agg(to_jsonb(latest)) FROM (
        SELECT DISTINCT ON (message_id)
          message_id, template_name, recipient_email, status, error_message, metadata, created_at
        FROM public.email_send_log
        WHERE message_id IS NOT NULL
          AND template_name IN (
            'full-works-order-confirmation','elite-order-confirmation','retainer-order-confirmation',
            'project-requirements-reminder','order-complete','full-works-order-complete',
            'elite-order-complete','retainer-order-complete'
          )
        ORDER BY message_id, created_at DESC
        LIMIT lim
      ) latest
    ), '[]'::jsonb),
    'counts', jsonb_build_object(
      'orders', (SELECT count(*) FROM public.stripe_checkout_sessions),
      'falloffs', (SELECT count(*) FROM public.visitor_falloffs),
      'conversations', (SELECT count(*) FROM public.chat_conversations),
      'profiles', (SELECT count(*) FROM public.client_profiles),
      'inquiries', (SELECT count(*) FROM public.contact_inquiries),
      'contacts', (SELECT count(*) FROM public.contacts),
      'contactEvents', (SELECT count(*) FROM public.contact_events),
      'contactPersons', (SELECT count(*) FROM public.contact_persons),
      'projectRequirements', (SELECT count(*) FROM public.project_requirements),
      'editRequests', (SELECT count(*) FROM public.edit_requests),
      'sampleRequests', (SELECT count(*) FROM public.lets_talk_leads WHERE source = 'free_sample_request'),
      'aiSampleGenerations', (SELECT count(*) FROM public.ai_sample_generations)
    )
  ) INTO result;

  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.portal_fetch_snapshot(integer) TO authenticated;

-- Section loader for "Load more" pagination
CREATE OR REPLACE FUNCTION public.portal_fetch_section(_section text, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  lim integer := GREATEST(1, LEAST(coalesce(_limit, 20), 500));
  off integer := GREATEST(0, coalesce(_offset, 0));
BEGIN
  PERFORM public.portal_require_admin();

  CASE _section
    WHEN 'orders' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.stripe_checkout_sessions ORDER BY created_at DESC OFFSET off LIMIT lim) s;
    WHEN 'falloffs' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.visitor_falloffs ORDER BY last_seen_at DESC OFFSET off LIMIT lim) f;
    WHEN 'conversations' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.chat_conversations ORDER BY updated_at DESC OFFSET off LIMIT lim) c;
    WHEN 'profiles' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.client_profiles ORDER BY updated_at DESC OFFSET off LIMIT lim) p;
    WHEN 'inquiries' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.contact_inquiries ORDER BY created_at DESC OFFSET off LIMIT lim) i;
    WHEN 'contacts' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(co)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.contacts ORDER BY updated_at DESC OFFSET off LIMIT lim) co;
    WHEN 'contactEvents' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(ce)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.contact_events ORDER BY created_at DESC OFFSET off LIMIT lim) ce;
    WHEN 'contactPersons' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(cp)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.contact_persons ORDER BY created_at DESC OFFSET off LIMIT lim) cp;
    WHEN 'projectRequirements' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(pr)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.project_requirements ORDER BY updated_at DESC OFFSET off LIMIT lim) pr;
    WHEN 'editRequests' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(er)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.edit_requests ORDER BY created_at DESC OFFSET off LIMIT lim) er;
    WHEN 'sampleRequests' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.lets_talk_leads WHERE source = 'free_sample_request' ORDER BY created_at DESC OFFSET off LIMIT lim) l;
    WHEN 'aiSampleGenerations' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.ai_sample_generations ORDER BY created_at DESC OFFSET off LIMIT lim) g;
    WHEN 'messages' THEN
      SELECT coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) INTO result
      FROM (SELECT * FROM public.chat_messages ORDER BY created_at DESC OFFSET off LIMIT lim) m;
    ELSE
      RAISE EXCEPTION 'Unknown section: %', _section;
  END CASE;

  RETURN coalesce(result, '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.portal_fetch_section(text, integer, integer) TO authenticated;