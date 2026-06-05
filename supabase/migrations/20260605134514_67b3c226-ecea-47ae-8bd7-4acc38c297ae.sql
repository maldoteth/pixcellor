CREATE POLICY "Admins read candidate files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'candidate-files' AND public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins write candidate files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'candidate-files' AND public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins update candidate files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'candidate-files' AND public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins delete candidate files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'candidate-files' AND public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Service role candidate files" ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'candidate-files');