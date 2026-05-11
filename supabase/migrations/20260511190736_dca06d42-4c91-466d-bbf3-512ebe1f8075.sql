ALTER TABLE public.ai_sample_generations ADD COLUMN IF NOT EXISTS preview_slug text;
CREATE INDEX IF NOT EXISTS ai_sample_generations_preview_slug_idx ON public.ai_sample_generations(preview_slug);