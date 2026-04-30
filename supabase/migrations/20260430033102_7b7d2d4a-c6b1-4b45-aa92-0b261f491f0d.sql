DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_events;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;