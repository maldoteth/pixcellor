
-- Cached vacancy templates: snapshot every deleted vacancy so it can be restored as a starting template
CREATE TABLE IF NOT EXISTS public.vacancy_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  snapshot jsonb NOT NULL,
  source_vacancy_id uuid,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vacancy_templates_client_idx ON public.vacancy_templates (client_contact_id);
CREATE INDEX IF NOT EXISTS vacancy_templates_title_idx ON public.vacancy_templates (lower(title));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacancy_templates TO authenticated;
GRANT ALL ON public.vacancy_templates TO service_role;

ALTER TABLE public.vacancy_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage vacancy templates" ON public.vacancy_templates;
CREATE POLICY "Admins manage vacancy templates" ON public.vacancy_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Snapshot trigger: before any vacancy delete, archive the row as a template
CREATE OR REPLACE FUNCTION public.snapshot_vacancy_to_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.vacancy_templates (client_contact_id, title, snapshot, source_vacancy_id, deleted_by)
  VALUES (
    OLD.client_contact_id,
    OLD.title,
    to_jsonb(OLD),
    OLD.id,
    auth.uid()
  );
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  -- never block delete if archiving fails
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_vacancy_before_delete ON public.vacancies;
CREATE TRIGGER snapshot_vacancy_before_delete
  BEFORE DELETE ON public.vacancies
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_vacancy_to_template();
