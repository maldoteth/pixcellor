REVOKE SELECT ON public.user_wallet_recovery FROM anon;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.user_wallet_passkeys (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL,
  transports TEXT,
  prf_salt TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, credential_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wallet_passkeys TO authenticated;
GRANT ALL ON public.user_wallet_passkeys TO service_role;

ALTER TABLE public.user_wallet_passkeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own passkeys" ON public.user_wallet_passkeys;
CREATE POLICY "Users manage their own passkeys"
  ON public.user_wallet_passkeys FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_wallet_passkeys_updated_at ON public.user_wallet_passkeys;
CREATE TRIGGER user_wallet_passkeys_updated_at
  BEFORE UPDATE ON public.user_wallet_passkeys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';