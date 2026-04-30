CREATE TABLE IF NOT EXISTS public.lead_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL UNIQUE,
  trade text,
  location text,
  outcome text NOT NULL DEFAULT 'seen',
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_search_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage lead search history" ON public.lead_search_history;
CREATE POLICY "Admins manage lead search history"
ON public.lead_search_history
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Backend manages lead search history" ON public.lead_search_history;
CREATE POLICY "Backend manages lead search history"
ON public.lead_search_history
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS lead_search_history_trade_location_idx
ON public.lead_search_history (lower(coalesce(trade, '')), lower(coalesce(location, '')), updated_at DESC);