ALTER TABLE public.visitor_falloffs
ADD COLUMN IF NOT EXISTS max_scroll_percent integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS portfolio_opened_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS portfolio_pages_viewed integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS portfolio_project_opened_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS portfolio_project_opened text,
ADD COLUMN IF NOT EXISTS pricing_opened_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS buy_clicked_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_visitor_falloffs_max_scroll_percent ON public.visitor_falloffs (max_scroll_percent);
CREATE INDEX IF NOT EXISTS idx_visitor_falloffs_pricing_opened_at ON public.visitor_falloffs (pricing_opened_at);
CREATE INDEX IF NOT EXISTS idx_visitor_falloffs_buy_clicked_at ON public.visitor_falloffs (buy_clicked_at);