ALTER TABLE public.vision_previews
  ADD COLUMN IF NOT EXISTS palette jsonb,
  ADD COLUMN IF NOT EXISTS fonts jsonb;

ALTER TABLE public.ai_sample_generations
  ADD COLUMN IF NOT EXISTS palette jsonb,
  ADD COLUMN IF NOT EXISTS fonts jsonb;

DROP FUNCTION IF EXISTS public.get_vision_preview_by_slug(text);

CREATE FUNCTION public.get_vision_preview_by_slug(_slug text)
RETURNS TABLE(
  slug text,
  title text,
  brief text,
  image_path text,
  created_at timestamp with time zone,
  palette jsonb,
  fonts jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT slug, title, brief, image_path, created_at, palette, fonts
  FROM public.vision_previews
  WHERE slug = _slug
  LIMIT 1;
$function$;