ALTER TABLE public.lets_talk_leads
  ADD COLUMN IF NOT EXISTS request_details jsonb,
  ADD COLUMN IF NOT EXISTS attachment_urls text[];