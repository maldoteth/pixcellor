-- Vision previews table
CREATE TABLE public.vision_previews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  brief TEXT,
  title TEXT,
  image_path TEXT NOT NULL,
  created_by_user_id UUID,
  created_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_vision_previews_slug ON public.vision_previews(slug);
CREATE INDEX idx_vision_previews_created_at ON public.vision_previews(created_at DESC);

ALTER TABLE public.vision_previews ENABLE ROW LEVEL SECURITY;

-- Public read (so prospects can view the shareable preview)
CREATE POLICY "Anyone can view vision previews"
ON public.vision_previews FOR SELECT
USING (true);

-- Admin only writes
CREATE POLICY "Admins can insert vision previews"
ON public.vision_previews FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update vision previews"
ON public.vision_previews FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete vision previews"
ON public.vision_previews FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_vision_previews_updated_at
BEFORE UPDATE ON public.vision_previews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vision-previews', 'vision-previews', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view vision preview images"
ON storage.objects FOR SELECT
USING (bucket_id = 'vision-previews');

CREATE POLICY "Admins can upload vision preview images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vision-previews' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update vision preview images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vision-previews' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete vision preview images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vision-previews' AND public.has_role(auth.uid(), 'admin'::public.app_role));