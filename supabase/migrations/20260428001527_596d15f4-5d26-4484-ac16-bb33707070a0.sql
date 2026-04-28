ALTER TABLE public.visitor_falloffs
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS ip_hostname text,
  ADD COLUMN IF NOT EXISTS ip_city text,
  ADD COLUMN IF NOT EXISTS ip_region text,
  ADD COLUMN IF NOT EXISTS ip_country text,
  ADD COLUMN IF NOT EXISTS ip_location text,
  ADD COLUMN IF NOT EXISTS ip_postal text,
  ADD COLUMN IF NOT EXISTS ip_timezone text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_domain text,
  ADD COLUMN IF NOT EXISTS company_type text,
  ADD COLUMN IF NOT EXISTS asn text,
  ADD COLUMN IF NOT EXISTS as_name text,
  ADD COLUMN IF NOT EXISTS as_domain text,
  ADD COLUMN IF NOT EXISTS as_route text,
  ADD COLUMN IF NOT EXISTS carrier_name text,
  ADD COLUMN IF NOT EXISTS carrier_mcc text,
  ADD COLUMN IF NOT EXISTS carrier_mnc text,
  ADD COLUMN IF NOT EXISTS privacy_vpn boolean,
  ADD COLUMN IF NOT EXISTS privacy_proxy boolean,
  ADD COLUMN IF NOT EXISTS privacy_tor boolean,
  ADD COLUMN IF NOT EXISTS privacy_relay boolean,
  ADD COLUMN IF NOT EXISTS privacy_hosting boolean,
  ADD COLUMN IF NOT EXISTS enrichment_source text,
  ADD COLUMN IF NOT EXISTS enrichment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enrichment_error text,
  ADD COLUMN IF NOT EXISTS enriched_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_visitor_falloffs_company_name ON public.visitor_falloffs (company_name);
CREATE INDEX IF NOT EXISTS idx_visitor_falloffs_company_domain ON public.visitor_falloffs (company_domain);
CREATE INDEX IF NOT EXISTS idx_visitor_falloffs_ip_country ON public.visitor_falloffs (ip_country);
CREATE INDEX IF NOT EXISTS idx_visitor_falloffs_enrichment_status ON public.visitor_falloffs (enrichment_status);