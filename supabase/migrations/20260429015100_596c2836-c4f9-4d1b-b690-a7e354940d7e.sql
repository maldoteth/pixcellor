-- Lock down client profiles: remove public access and allow admins only
DROP POLICY IF EXISTS "Public read client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Public insert client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Public update client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Admins manage client profiles" ON public.client_profiles;

CREATE POLICY "Admins manage client profiles"
ON public.client_profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Lock down visitor analytics: admins can view, backend functions can write
DROP POLICY IF EXISTS "Visitors can create consented falloff records" ON public.visitor_falloffs;
DROP POLICY IF EXISTS "Visitors can update own consented falloff records" ON public.visitor_falloffs;
DROP POLICY IF EXISTS "Backend can manage visitor falloffs" ON public.visitor_falloffs;

CREATE POLICY "Backend can manage visitor falloffs"
ON public.visitor_falloffs
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Lock down chat data: no global public reads, admins retain access
DROP POLICY IF EXISTS "Allow public read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow public read conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Allow public update conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Admins manage conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Admins manage messages" ON public.chat_messages;

CREATE POLICY "Admins manage conversations"
ON public.chat_conversations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage messages"
ON public.chat_messages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Safe public chat history function: visitor must provide their own client/session token
CREATE OR REPLACE FUNCTION public.fetch_chat_history(_client_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF _client_id IS NULL OR length(_client_id) < 8 OR length(_client_id) > 200 THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;

  SELECT jsonb_build_object(
    'conversation', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('id', c.id, 'bot_paused', c.bot_paused) END,
    'messages', coalesce((
      SELECT jsonb_agg(jsonb_build_object('role', m.role, 'content', m.content) ORDER BY m.created_at ASC)
      FROM public.chat_messages m
      WHERE m.conversation_id = c.id
    ), '[]'::jsonb)
  )
  INTO result
  FROM public.chat_conversations c
  WHERE c.client_id = _client_id
  ORDER BY c.created_at DESC
  LIMIT 1;

  RETURN coalesce(result, jsonb_build_object('conversation', NULL, 'messages', '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_chat_history(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_chat_history(text) TO anon, authenticated;