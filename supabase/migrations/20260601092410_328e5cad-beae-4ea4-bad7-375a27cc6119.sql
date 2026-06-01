
ALTER TABLE public.customer_leads
  ADD COLUMN IF NOT EXISTS callback_at timestamptz,
  ADD COLUMN IF NOT EXISTS callback_completed_at timestamptz;

CREATE INDEX IF NOT EXISTS customer_leads_callback_idx
  ON public.customer_leads (owner_user_id, callback_at)
  WHERE callback_at IS NOT NULL AND callback_completed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.customer_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.customer_leads(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'note',
  title text NOT NULL,
  description text,
  callback_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_lead_events_lead_idx
  ON public.customer_lead_events (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_lead_events_owner_idx
  ON public.customer_lead_events (owner_user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_lead_events TO authenticated;
GRANT ALL ON public.customer_lead_events TO service_role;

ALTER TABLE public.customer_lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own lead events"
  ON public.customer_lead_events FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners insert own lead events"
  ON public.customer_lead_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners update own lead events"
  ON public.customer_lead_events FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners delete own lead events"
  ON public.customer_lead_events FOR DELETE TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Admins manage all customer lead events"
  ON public.customer_lead_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_customer_lead_events_updated_at
  BEFORE UPDATE ON public.customer_lead_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
