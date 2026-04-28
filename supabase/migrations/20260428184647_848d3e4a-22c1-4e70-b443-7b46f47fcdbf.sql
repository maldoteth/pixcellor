ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_role_check;

ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_role_check
CHECK (role IN ('user', 'assistant', 'admin'));

CREATE OR REPLACE FUNCTION public.portal_send_chat_reply(_conversation_id uuid, _content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  clean_content text := nullif(trim(_content), '');
BEGIN
  PERFORM public.portal_require_admin();

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