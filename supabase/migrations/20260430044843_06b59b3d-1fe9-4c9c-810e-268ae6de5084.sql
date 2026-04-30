DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contacts_source_url_unique'
      AND conrelid = 'public.contacts'::regclass
  ) THEN
    ALTER TABLE public.contacts
    ADD CONSTRAINT contacts_source_url_unique UNIQUE (source_url);
  END IF;
END $$;