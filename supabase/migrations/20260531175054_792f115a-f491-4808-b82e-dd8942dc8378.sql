
-- Partner accounts: map a logged-in user (by email) to a contacts.source key
CREATE TABLE public.partner_accounts (
  email text PRIMARY KEY,
  source_key text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_accounts TO authenticated;
GRANT ALL ON public.partner_accounts TO service_role;

ALTER TABLE public.partner_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner accounts"
  ON public.partner_accounts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users see own partner row"
  ON public.partner_accounts FOR SELECT
  TO authenticated
  USING (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), '')));

-- Security definer fn: returns the partner source_key for the given user, or NULL
CREATE OR REPLACE FUNCTION public.partner_source_for(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pa.source_key
    FROM public.partner_accounts pa
    JOIN auth.users u ON lower(u.email) = lower(pa.email)
   WHERE u.id = _user_id
   LIMIT 1
$$;

-- Allow partner users to read only their own leads from contacts
CREATE POLICY "Partners read own-source contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (
    public.partner_source_for(auth.uid()) IS NOT NULL
    AND lower(source) = lower(public.partner_source_for(auth.uid()))
  );

-- Seed Dan
INSERT INTO public.partner_accounts (email, source_key, label)
VALUES ('dmbscaffoldingltd@outlook.com', 'dmb_scaffolding', 'DMB Scaffolding')
ON CONFLICT (email) DO UPDATE SET source_key = EXCLUDED.source_key, label = EXCLUDED.label;
