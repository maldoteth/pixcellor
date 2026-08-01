ALTER TABLE public.visitor_falloffs
  ADD COLUMN IF NOT EXISTS session_started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS session_ended_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS session_duration_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_duration_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visibility_change_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS identified_email text,
  ADD COLUMN IF NOT EXISTS identified_email_source text,
  ADD COLUMN IF NOT EXISTS page_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS connection_type text,
  ADD COLUMN IF NOT EXISTS touch_points integer;

CREATE INDEX IF NOT EXISTS idx_visitor_falloffs_identified_email
  ON public.visitor_falloffs (identified_email);

CREATE INDEX IF NOT EXISTS idx_visitor_falloffs_session_duration
  ON public.visitor_falloffs (session_duration_seconds DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_falloffs_utm_source
  ON public.visitor_falloffs (utm_source);
