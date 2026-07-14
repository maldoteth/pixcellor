-- Passkey (WebAuthn PRF) envelopes for wallet seeds.
-- Additive: does not touch user_wallets / user_wallet_recovery. Each row holds
-- the seed encrypted under a credential's PRF-derived key. A user may register
-- multiple passkeys (one per device). The 24-word recovery code remains the
-- ultimate backstop; passkeys are an additional, phishing/brute-force-resistant
-- unlock method.

CREATE TABLE public.user_wallet_passkeys (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL,       -- base64url of the WebAuthn credential id
  transports TEXT,                   -- JSON array of transports, nullable
  prf_salt TEXT NOT NULL,            -- base64
  ciphertext TEXT NOT NULL,          -- base64 (AES-256-GCM)
  iv TEXT NOT NULL,                  -- base64
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, credential_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wallet_passkeys TO authenticated;
GRANT ALL ON public.user_wallet_passkeys TO service_role;

ALTER TABLE public.user_wallet_passkeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own passkeys"
  ON public.user_wallet_passkeys FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_wallet_passkeys_updated_at
  BEFORE UPDATE ON public.user_wallet_passkeys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
