ALTER TABLE public.chat_conversations
ADD COLUMN IF NOT EXISTS bot_paused boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_handoff_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.portal_send_chat_reply(_access_code text, _conversation_id uuid, _content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clean_content text := nullif(trim(_content), '');
BEGIN
  PERFORM public.portal_require_access(_access_code);

  IF clean_content IS NULL OR length(clean_content) > 2000 THEN
    RAISE EXCEPTION 'Reply is required and must be 2000 characters or fewer';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.chat_conversations WHERE id = _conversation_id) THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  INSERT INTO public.chat_messages (conversation_id, role, content)
  VALUES (_conversation_id, 'admin', clean_content);

  UPDATE public.chat_conversations
  SET bot_paused = true,
      manual_handoff_at = coalesce(manual_handoff_at, now()),
      updated_at = now()
  WHERE id = _conversation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.portal_close_chat_case(_access_code text, _conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.portal_require_access(_access_code);

  UPDATE public.chat_conversations
  SET bot_paused = false,
      manual_handoff_at = null,
      updated_at = now()
  WHERE id = _conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
END;
$function$;

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
    'conversations', coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.updated_at DESC) FROM public.chat_conversations c), '[]'::jsonb),
    'messages', coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC) FROM public.chat_messages m), '[]'::jsonb),
    'profiles', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.updated_at DESC) FROM public.client_profiles p), '[]'::jsonb),
    'inquiries', coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC) FROM public.contact_inquiries i), '[]'::jsonb),
    'contacts', coalesce((SELECT jsonb_agg(to_jsonb(co) ORDER BY co.updated_at DESC) FROM public.contacts co), '[]'::jsonb),
    'contactEvents', coalesce((SELECT jsonb_agg(to_jsonb(ce) ORDER BY ce.created_at DESC) FROM public.contact_events ce), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.portal_send_chat_reply(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_close_chat_case(text, uuid) TO anon, authenticated;