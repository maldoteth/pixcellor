-- H4: Add file-size limits and MIME-type allowlists to all storage buckets.
-- Defence-in-depth only — every UI already restricts to image (or image/video).
-- This blocks abusive uploads (huge files, executables, scripts) at the
-- storage layer without changing any current user/admin/bot flow.

UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'chat-images';

UPDATE storage.buckets
SET file_size_limit = 52428800, -- 50 MB (videos may be larger)
    allowed_mime_types = ARRAY[
      'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif',
      'video/mp4','video/quicktime','video/webm'
    ]
WHERE id = 'submission-attachments';

UPDATE storage.buckets
SET file_size_limit = 26214400, -- 25 MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'vision-previews';

UPDATE storage.buckets
SET file_size_limit = 26214400, -- 25 MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
WHERE id = 'email-assets';

UPDATE storage.buckets
SET file_size_limit = 26214400, -- 25 MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'portfolio-screenshots';