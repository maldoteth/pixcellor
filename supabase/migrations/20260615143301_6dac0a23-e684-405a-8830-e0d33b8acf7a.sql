
CREATE TABLE public.byow_generated_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT UNIQUE NOT NULL,
  owner_user_id UUID NULL,
  email TEXT NULL,
  display_name TEXT NOT NULL,
  brief TEXT NULL,
  doc JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.byow_generated_sites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.byow_generated_sites TO authenticated;
GRANT ALL ON public.byow_generated_sites TO service_role;
ALTER TABLE public.byow_generated_sites ENABLE ROW LEVEL SECURITY;

-- Anyone can read any site by ref (preview is public)
CREATE POLICY "Public can read generated sites"
ON public.byow_generated_sites FOR SELECT
USING (true);

-- Anyone (including anonymous) can create a draft site
CREATE POLICY "Anyone can create draft site"
ON public.byow_generated_sites FOR INSERT
WITH CHECK (status = 'draft');

-- Owner can update their own site; drafts (no owner) can be updated by anyone with the ref (preview/edit before signup)
CREATE POLICY "Owner or unowned draft can update"
ON public.byow_generated_sites FOR UPDATE
USING (owner_user_id = auth.uid() OR owner_user_id IS NULL)
WITH CHECK (owner_user_id = auth.uid() OR owner_user_id IS NULL);

-- Owner can delete
CREATE POLICY "Owner can delete site"
ON public.byow_generated_sites FOR DELETE
USING (owner_user_id = auth.uid());

CREATE INDEX idx_byow_generated_sites_owner ON public.byow_generated_sites (owner_user_id);
CREATE INDEX idx_byow_generated_sites_email ON public.byow_generated_sites (email);

CREATE TRIGGER update_byow_generated_sites_updated_at
BEFORE UPDATE ON public.byow_generated_sites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
