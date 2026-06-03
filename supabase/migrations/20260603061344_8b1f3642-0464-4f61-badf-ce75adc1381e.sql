
-- Allow multiple source_keys per email
ALTER TABLE public.customer_lead_sources DROP CONSTRAINT partner_accounts_pkey;
ALTER TABLE public.customer_lead_sources ADD PRIMARY KEY (email, source_key);

-- New helper that checks if the current user's email is mapped to a given source
CREATE OR REPLACE FUNCTION public.customer_has_lead_source(_user_id uuid, _source text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.customer_lead_sources cls
    JOIN auth.users u ON lower(u.email) = lower(cls.email)
    WHERE u.id = _user_id
      AND lower(cls.source_key) = lower(_source)
  )
$$;

-- Replace RLS policy on contacts to use the new multi-source check
DROP POLICY IF EXISTS "Customers read own-source contacts" ON public.contacts;
CREATE POLICY "Customers read own-source contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (public.customer_has_lead_source(auth.uid(), source));

-- Add the new mapping for Set In Stone Tiling LTD
INSERT INTO public.customer_lead_sources (email, source_key, label)
VALUES ('setinstoneltd@outlook.com', 'set_in_stone_tiling', 'Set In Stone Tiling LTD')
ON CONFLICT (email, source_key) DO UPDATE SET label = EXCLUDED.label;
