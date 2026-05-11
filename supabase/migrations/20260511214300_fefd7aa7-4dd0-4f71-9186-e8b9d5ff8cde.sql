-- H4 part 2: Drop broad SELECT policies that let anyone enumerate every
-- filename in the public buckets. Direct URL access via
--   /storage/v1/object/public/<bucket>/<path>
-- bypasses RLS for buckets marked public=true, so all <img src> loads in
-- emails, chat, customer portal, vision previews continue to work.
-- Verified no code uses storage.from(...).list() anywhere.

DROP POLICY IF EXISTS "Anyone can view vision preview images" ON storage.objects;
DROP POLICY IF EXISTS "Email assets are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public can read portfolio screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public can read submission attachments" ON storage.objects;
DROP POLICY IF EXISTS "Chat images can be viewed by path" ON storage.objects;