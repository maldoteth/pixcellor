
CREATE TABLE public.affiliate_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  method TEXT NOT NULL CHECK (method IN ('bank','crypto')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','paid','rejected')),
  account_holder_name TEXT,
  sort_code TEXT,
  account_number TEXT,
  crypto_currency TEXT CHECK (crypto_currency IN ('ETH','BTC')),
  wallet_address TEXT,
  admin_note TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;

ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their payouts"
  ON public.affiliate_payouts FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners create their payouts"
  ON public.affiliate_payouts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Admins read all payouts"
  ON public.affiliate_payouts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update payouts"
  ON public.affiliate_payouts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete payouts"
  ON public.affiliate_payouts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX affiliate_payouts_owner_idx ON public.affiliate_payouts(owner_user_id);
CREATE INDEX affiliate_payouts_status_idx ON public.affiliate_payouts(status);
CREATE UNIQUE INDEX affiliate_payouts_one_open_per_user
  ON public.affiliate_payouts(owner_user_id)
  WHERE status IN ('requested','approved');

CREATE TRIGGER update_affiliate_payouts_updated_at
  BEFORE UPDATE ON public.affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
