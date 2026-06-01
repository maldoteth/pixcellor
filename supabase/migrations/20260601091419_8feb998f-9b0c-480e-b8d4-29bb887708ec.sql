
CREATE TABLE public.customer_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  company text,
  notes text,
  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'customer_added',
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_leads TO authenticated;
GRANT ALL ON public.customer_leads TO service_role;

ALTER TABLE public.customer_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own leads"
  ON public.customer_leads FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners insert own leads"
  ON public.customer_leads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners update own leads"
  ON public.customer_leads FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners delete own leads"
  ON public.customer_leads FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Admins manage all customer leads"
  ON public.customer_leads FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_customer_leads_owner ON public.customer_leads(owner_user_id, created_at DESC);

CREATE TRIGGER trg_customer_leads_updated_at
  BEFORE UPDATE ON public.customer_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
