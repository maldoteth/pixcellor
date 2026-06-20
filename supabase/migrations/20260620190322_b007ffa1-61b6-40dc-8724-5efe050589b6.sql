CREATE TABLE public.user_bank_details (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  sort_code TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bank_details TO authenticated;
GRANT ALL ON public.user_bank_details TO service_role;
ALTER TABLE public.user_bank_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own bank details"
  ON public.user_bank_details FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cash_out_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  chain TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  gbp_value NUMERIC,
  full_name TEXT NOT NULL,
  sort_code TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_out_requests TO authenticated;
GRANT ALL ON public.cash_out_requests TO service_role;
ALTER TABLE public.cash_out_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert their own cash-out requests"
  ON public.cash_out_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view their own cash-out requests"
  ON public.cash_out_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all cash-out requests"
  ON public.cash_out_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER user_bank_details_updated_at BEFORE UPDATE ON public.user_bank_details
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER cash_out_requests_updated_at BEFORE UPDATE ON public.cash_out_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();