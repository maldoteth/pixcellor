
CREATE TABLE public.affiliate_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_coupon_id TEXT,
  stripe_promotion_code_id TEXT,
  buyer_discount_pct INTEGER NOT NULL DEFAULT 10,
  affiliate_commission_pct INTEGER NOT NULL DEFAULT 5,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.affiliate_codes TO authenticated;
GRANT ALL ON public.affiliate_codes TO service_role;
ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their codes" ON public.affiliate_codes FOR SELECT TO authenticated USING (auth.uid() = owner_user_id);
CREATE POLICY "Owners insert their codes" ON public.affiliate_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Owners update their codes" ON public.affiliate_codes FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE INDEX affiliate_codes_owner_idx ON public.affiliate_codes(owner_user_id);
CREATE INDEX affiliate_codes_promo_idx ON public.affiliate_codes(stripe_promotion_code_id);

CREATE TABLE public.affiliate_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID REFERENCES public.affiliate_codes(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  owner_user_id UUID NOT NULL,
  checkout_session_id TEXT NOT NULL UNIQUE,
  amount_subtotal_cents BIGINT,
  amount_total_cents BIGINT,
  currency TEXT,
  commission_cents BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  buyer_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their referrals" ON public.affiliate_referrals FOR SELECT TO authenticated USING (auth.uid() = owner_user_id);
CREATE INDEX affiliate_referrals_owner_idx ON public.affiliate_referrals(owner_user_id);
