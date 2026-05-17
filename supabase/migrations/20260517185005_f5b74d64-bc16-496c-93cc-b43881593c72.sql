DELETE FROM public.chat_messages
WHERE conversation_id IN (
  SELECT c.id
  FROM public.chat_conversations c
  LEFT JOIN public.chat_messages m
    ON m.conversation_id = c.id AND m.role = 'user'
  WHERE m.id IS NULL
);

DELETE FROM public.chat_conversations c
WHERE NOT EXISTS (
  SELECT 1 FROM public.chat_messages m
  WHERE m.conversation_id = c.id AND m.role = 'user'
);