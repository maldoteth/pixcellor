ALTER TABLE public.vision_previews ADD COLUMN IF NOT EXISTS comparison_image_path text;

DROP FUNCTION IF EXISTS public.get_vision_preview_by_slug(text);

CREATE OR REPLACE FUNCTION public.get_vision_preview_by_slug(_slug text)
RETURNS TABLE(slug text, title text, brief text, image_path text, comparison_image_path text, created_at timestamp with time zone, palette jsonb, fonts jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT slug, title, brief, image_path, comparison_image_path, created_at, palette, fonts
  FROM public.vision_previews
  WHERE slug = _slug
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_vision_preview_by_slug(text) TO anon, authenticated;