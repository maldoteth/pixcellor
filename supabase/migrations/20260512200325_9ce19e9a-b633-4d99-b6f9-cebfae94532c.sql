CREATE TABLE public.custom_payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid,
  created_by_email text,
  stripe_product_id text,
  stripe_price_id text,
  stripe_payment_link_id text,
  url text NOT NULL,
  description text NOT NULL,
  amount_gbp numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'gbp',
  quantity integer NOT NULL DEFAULT 1,
  mode text NOT NULL DEFAULT 'payment',
  client_email text,
  internal_note text,
  status text NOT NULL DEFAULT 'open',
  paid_session_id text,
  paid_at timestamptz
);

ALTER TABLE public.custom_payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage custom payment links"
ON public.custom_payment_links
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages custom payment links"
ON public.custom_payment_links
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_custom_payment_links_updated_at
BEFORE UPDATE ON public.custom_payment_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_custom_payment_links_created_at ON public.custom_payment_links(created_at DESC);
CREATE INDEX idx_custom_payment_links_status ON public.custom_payment_links(status);