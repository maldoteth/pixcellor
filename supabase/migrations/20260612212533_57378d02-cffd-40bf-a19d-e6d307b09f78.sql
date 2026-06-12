
ALTER TABLE public.package_reviews DROP CONSTRAINT IF EXISTS package_reviews_user_id_fkey;
ALTER TABLE public.package_reviews ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.package_reviews ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;
ALTER TABLE public.package_reviews ADD CONSTRAINT package_reviews_user_or_template
  CHECK (is_template = true OR user_id IS NOT NULL);
ALTER TABLE public.package_reviews ADD CONSTRAINT package_reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
