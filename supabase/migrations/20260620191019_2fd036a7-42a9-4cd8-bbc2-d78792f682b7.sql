CREATE TABLE public.user_wallet_recovery (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  encrypted_seed TEXT NOT NULL,
  salt TEXT NOT NULL,
  iv TEXT NOT NULL,
  kdf_iterations INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wallet_recovery TO authenticated;
GRANT ALL ON public.user_wallet_recovery TO service_role;
ALTER TABLE public.user_wallet_recovery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own wallet recovery"
  ON public.user_wallet_recovery FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_wallet_recovery_updated_at BEFORE UPDATE ON public.user_wallet_recovery
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.wallet_tx_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wallet_tx_otps_user_purpose_idx ON public.wallet_tx_otps(user_id, purpose, created_at DESC);
GRANT SELECT ON public.wallet_tx_otps TO authenticated;
GRANT ALL ON public.wallet_tx_otps TO service_role;
ALTER TABLE public.wallet_tx_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own OTPs"
  ON public.wallet_tx_otps FOR SELECT TO authenticated
  USING (auth.uid() = user_id);