## Problem

Right now every time the chat widget opens, the edge function `sales-chat` creates a `chat_conversations` row and saves the assistant's greeting — even if the visitor never types anything back. The Chats tab fills up with junk one-sided greetings.

## Fix

### 1. Don't create a conversation until the user actually replies

In `supabase/functions/sales-chat/index.ts` (the request handler, around lines 1999–2045):

- When the incoming `messages` array contains no user message (i.e. the initial greeting call from `startConversation()`), skip:
  - the `chat_conversations` insert
  - the assistant-reply insert at the bottom (line 2451)
- Only create/lookup the `chat_conversations` row when the latest message is a `user` message.
- Continue returning the greeting reply to the client, just without a `conversationId`. The next time the user actually types, the conversation row gets created and the user message is persisted as message #1 (the greeting stays ephemeral — acceptable since it's identical for every visitor).
- Dev mode (`isDevMode`) flow is unaffected — it doesn't create conversations from greetings anyway.

### 2. Purge existing empty conversations

One-off cleanup via the insert tool:

```sql
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
```

This removes any conversation that has zero user messages (whether totally empty or assistant-only greetings).

## Files touched

- `supabase/functions/sales-chat/index.ts` — gate conversation creation + assistant-save on presence of a user message
- One destructive SQL run via the migration tool for the purge
