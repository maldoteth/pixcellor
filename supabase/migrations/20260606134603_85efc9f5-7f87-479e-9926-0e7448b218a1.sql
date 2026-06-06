
-- 1) Schema: extend candidate_documents
ALTER TABLE public.candidate_documents
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 2) RLS: let candidates read their own docs (admins already covered by existing policy)
DROP POLICY IF EXISTS "Candidates read own docs" ON public.candidate_documents;
CREATE POLICY "Candidates read own docs"
  ON public.candidate_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_documents.candidate_id AND c.user_id = auth.uid()
    )
  );

-- 3) Storage RLS for candidate self-managed files in their own folder
DROP POLICY IF EXISTS "Candidates upload own files" ON storage.objects;
CREATE POLICY "Candidates upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-files'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.candidates WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Candidates read own files" ON storage.objects;
CREATE POLICY "Candidates read own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'candidate-files'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.candidates WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Candidates delete own files" ON storage.objects;
CREATE POLICY "Candidates delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'candidate-files'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.candidates WHERE user_id = auth.uid()
    )
  );

-- 4) RPCs

-- Candidate: list own KYC documents
CREATE OR REPLACE FUNCTION public.candidate_list_my_documents()
RETURNS SETOF public.candidate_documents
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.candidate_documents
  WHERE candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid())
  ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.candidate_list_my_documents() TO authenticated;

-- Candidate: upload own document (resolves candidate by user_id or email)
CREATE OR REPLACE FUNCTION public.candidate_self_add_document(
  _category text,
  _label text,
  _file_url text,
  _filename text,
  _size_bytes bigint,
  _mime_type text,
  _expires_at date
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cid uuid;
  _email text;
  _new_id uuid;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  SELECT id INTO _cid FROM public.candidates WHERE user_id = auth.uid() LIMIT 1;
  IF _cid IS NULL AND _email IS NOT NULL THEN
    SELECT id INTO _cid FROM public.candidates WHERE lower(email) = lower(_email) LIMIT 1;
    IF _cid IS NOT NULL THEN
      UPDATE public.candidates SET user_id = auth.uid() WHERE id = _cid;
    END IF;
  END IF;
  IF _cid IS NULL THEN
    RAISE EXCEPTION 'No candidate record found for the current user';
  END IF;

  INSERT INTO public.candidate_documents
    (candidate_id, kind, category, label, file_url, filename, size_bytes, mime_type,
     expires_at, status, uploaded_by_user_id, uploaded_by_email)
  VALUES
    (_cid, _category, _category, _label, _file_url, _filename, _size_bytes, _mime_type,
     _expires_at, 'pending', auth.uid(), _email)
  RETURNING id INTO _new_id;
  RETURN _new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.candidate_self_add_document(text,text,text,text,bigint,text,date) TO authenticated;

-- Candidate: delete own document while still pending
CREATE OR REPLACE FUNCTION public.candidate_delete_my_document(_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.candidate_documents
  WHERE id = _id
    AND status = 'pending'
    AND candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid());
END $$;
GRANT EXECUTE ON FUNCTION public.candidate_delete_my_document(uuid) TO authenticated;

-- Admin: list all documents for a candidate
CREATE OR REPLACE FUNCTION public.portal_list_candidate_documents(_candidate_id uuid)
RETURNS SETOF public.candidate_documents
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT * FROM public.candidate_documents
    WHERE candidate_id = _candidate_id
    ORDER BY created_at DESC;
END $$;
GRANT EXECUTE ON FUNCTION public.portal_list_candidate_documents(uuid) TO authenticated;

-- Admin: set verification status with note
CREATE OR REPLACE FUNCTION public.portal_set_document_status(
  _id uuid, _status text, _note text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _status NOT IN ('pending','verified','rejected') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE public.candidate_documents
  SET status = _status,
      review_note = _note,
      reviewed_by_user_id = auth.uid(),
      reviewed_at = now()
  WHERE id = _id;
END $$;
GRANT EXECUTE ON FUNCTION public.portal_set_document_status(uuid,text,text) TO authenticated;

-- Admin: delete a document
CREATE OR REPLACE FUNCTION public.portal_delete_candidate_document(_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.candidate_documents WHERE id = _id;
END $$;
GRANT EXECUTE ON FUNCTION public.portal_delete_candidate_document(uuid) TO authenticated;

-- Admin: extend add-document RPC with category/label/expiry
CREATE OR REPLACE FUNCTION public.portal_add_candidate_document(
  _candidate_id uuid,
  _kind text,
  _file_url text,
  _filename text DEFAULT NULL,
  _size_bytes bigint DEFAULT NULL,
  _mime_type text DEFAULT NULL,
  _category text DEFAULT NULL,
  _label text DEFAULT NULL,
  _expires_at date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _new_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.candidate_documents
    (candidate_id, kind, file_url, filename, size_bytes, mime_type,
     category, label, expires_at, status,
     uploaded_by_user_id, uploaded_by_email)
  VALUES
    (_candidate_id, _kind, _file_url, _filename, _size_bytes, _mime_type,
     COALESCE(_category, _kind), _label, _expires_at, 'pending',
     auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()))
  RETURNING id INTO _new_id;
  RETURN jsonb_build_object('id', _new_id);
END $$;
GRANT EXECUTE ON FUNCTION public.portal_add_candidate_document(uuid,text,text,text,bigint,text,text,text,date) TO authenticated;
