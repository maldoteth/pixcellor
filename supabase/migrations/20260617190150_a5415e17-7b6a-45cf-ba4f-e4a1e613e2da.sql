
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.set_contact_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by_user_id IS NULL THEN
    NEW.created_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contacts_set_owner ON public.contacts;
CREATE TRIGGER contacts_set_owner BEFORE INSERT ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.set_contact_owner();

DROP POLICY IF EXISTS "Users select own contacts" ON public.contacts;
CREATE POLICY "Users select own contacts" ON public.contacts FOR SELECT TO authenticated
  USING (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own contacts" ON public.contacts;
CREATE POLICY "Users insert own contacts" ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = auth.uid() OR created_by_user_id IS NULL);

DROP POLICY IF EXISTS "Users update own contacts" ON public.contacts;
CREATE POLICY "Users update own contacts" ON public.contacts FOR UPDATE TO authenticated
  USING (created_by_user_id = auth.uid()) WITH CHECK (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own contacts" ON public.contacts;
CREATE POLICY "Users delete own contacts" ON public.contacts FOR DELETE TO authenticated
  USING (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own contact events" ON public.contact_events;
CREATE POLICY "Users manage own contact events" ON public.contact_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_events.contact_id AND c.created_by_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_events.contact_id AND c.created_by_user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_events TO authenticated;

CREATE INDEX IF NOT EXISTS contacts_name_trgm ON public.contacts USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS contacts_created_by_user_id_idx ON public.contacts (created_by_user_id);
