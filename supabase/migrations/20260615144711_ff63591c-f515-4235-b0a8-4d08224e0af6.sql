
-- Drop email column entirely (PII leak risk) and any unowned-draft loophole
ALTER TABLE public.byow_generated_sites DROP COLUMN IF EXISTS email;
DROP INDEX IF EXISTS idx_byow_generated_sites_email;

-- Tighten policies: only logged-in owners can create/update/delete; public can still
-- read the generated doc by ref (no PII left in the table).
DROP POLICY IF EXISTS "Public can read generated sites" ON public.byow_generated_sites;
DROP POLICY IF EXISTS "Anyone can create draft site" ON public.byow_generated_sites;
DROP POLICY IF EXISTS "Owner or unowned draft can update" ON public.byow_generated_sites;
DROP POLICY IF EXISTS "Owner can delete site" ON public.byow_generated_sites;

-- Clean up any pre-existing unowned drafts so the NOT NULL constraint can apply
DELETE FROM public.byow_generated_sites WHERE owner_user_id IS NULL;
ALTER TABLE public.byow_generated_sites ALTER COLUMN owner_user_id SET NOT NULL;

-- Revoke anon write access; public can only read the site doc by ref
REVOKE INSERT, UPDATE, DELETE ON public.byow_generated_sites FROM anon;
GRANT SELECT ON public.byow_generated_sites TO anon;

CREATE POLICY "Public can read generated sites"
ON public.byow_generated_sites FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create their own site"
ON public.byow_generated_sites FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid() AND status = 'draft');

CREATE POLICY "Owner can update own site"
ON public.byow_generated_sites FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owner can delete own site"
ON public.byow_generated_sites FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());
