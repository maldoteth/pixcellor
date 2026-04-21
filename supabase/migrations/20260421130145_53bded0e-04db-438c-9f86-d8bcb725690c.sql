-- client_profiles: per-email customer record
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  company TEXT,
  brand_colours TEXT,
  page_count INTEGER,
  content_notes TEXT,
  requirements TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_profiles_email ON public.client_profiles (lower(email));

ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read client profiles"
  ON public.client_profiles FOR SELECT
  USING (true);

CREATE POLICY "Public insert client profiles"
  ON public.client_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update client profiles"
  ON public.client_profiles FOR UPDATE
  USING (true);

CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- project_status: pipeline stage per client email
CREATE TABLE public.project_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  stage TEXT NOT NULL DEFAULT 'brief_received',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_status_email ON public.project_status (lower(email));

ALTER TABLE public.project_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read project status"
  ON public.project_status FOR SELECT
  USING (true);

CREATE POLICY "Public insert project status"
  ON public.project_status FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update project status"
  ON public.project_status FOR UPDATE
  USING (true);

CREATE TRIGGER update_project_status_updated_at
  BEFORE UPDATE ON public.project_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();