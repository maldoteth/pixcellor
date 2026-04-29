DROP POLICY IF EXISTS "Anyone can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;

CREATE POLICY "Chat image uploads are limited to image files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] IN ('sales', 'dev')
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
);

CREATE POLICY "Chat images can be viewed by path"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] IN ('sales', 'dev')
);