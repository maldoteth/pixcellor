ALTER TABLE public.portfolio_projects ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-screenshots', 'portfolio-screenshots', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Public can read portfolio screenshots"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'portfolio-screenshots');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages portfolio screenshots"
    ON storage.objects FOR ALL
    USING (bucket_id = 'portfolio-screenshots' AND auth.role() = 'service_role')
    WITH CHECK (bucket_id = 'portfolio-screenshots' AND auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;