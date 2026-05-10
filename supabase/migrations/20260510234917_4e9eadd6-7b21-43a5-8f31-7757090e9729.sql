ALTER TABLE public.vision_previews 
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;