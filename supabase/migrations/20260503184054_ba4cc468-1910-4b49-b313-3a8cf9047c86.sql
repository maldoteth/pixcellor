
ALTER TABLE public.project_requirements
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.edit_requests
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('submission-attachments', 'submission-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can read submission attachments" ON storage.objects;
CREATE POLICY "Public can read submission attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'submission-attachments');

DROP POLICY IF EXISTS "Anyone can upload submission attachments" ON storage.objects;
CREATE POLICY "Anyone can upload submission attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'submission-attachments');
