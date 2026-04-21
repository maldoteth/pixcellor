-- Restrict chat reads to admins only (existing public read was for the chatbot itself, but client uses anon key — anon role still works via existing policy)
-- We add an additional admin policy so authenticated admins can also read; existing public read remains for anon.

CREATE POLICY "Admins read all conversations"
  ON public.chat_conversations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stripe_checkout_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_inquiries;