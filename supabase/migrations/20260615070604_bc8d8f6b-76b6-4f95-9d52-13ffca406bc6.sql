
-- BYOW: Build Your Own Website client portal
-- Phase 1 schema

-- =========================================================
-- byow_sites
-- =========================================================
CREATE TABLE public.byow_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  lovable_project_id TEXT,
  lovable_preview_url TEXT,
  published_url TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | archived
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.byow_sites TO authenticated;
GRANT ALL ON public.byow_sites TO service_role;

ALTER TABLE public.byow_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own sites"
  ON public.byow_sites FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can update their own sites"
  ON public.byow_sites FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sites"
  ON public.byow_sites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sites"
  ON public.byow_sites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- byow_messages
-- =========================================================
CREATE TABLE public.byow_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.byow_sites(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'safe' CHECK (mode IN ('safe', 'full')),
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('pending', 'streaming', 'done', 'error', 'queued')),
  credits_cost INTEGER NOT NULL DEFAULT 0,
  mcp_run_id TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX byow_messages_site_id_idx ON public.byow_messages(site_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.byow_messages TO authenticated;
GRANT ALL ON public.byow_messages TO service_role;

ALTER TABLE public.byow_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see messages for their sites"
  ON public.byow_messages FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients write messages for their sites"
  ON public.byow_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

-- =========================================================
-- byow_subscriptions  (one active row per site)
-- =========================================================
CREATE TABLE public.byow_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.byow_sites(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('care', 'studio', 'agency')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive', -- inactive | active | past_due | canceled
  prompt_quota INTEGER NOT NULL DEFAULT 0,
  prompts_used INTEGER NOT NULL DEFAULT 0,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.byow_subscriptions TO authenticated;
GRANT ALL ON public.byow_subscriptions TO service_role;

ALTER TABLE public.byow_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view their own subscription"
  ON public.byow_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage subscriptions"
  ON public.byow_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- byow_admin_queue  (fallback when MCP cannot auto-apply)
-- =========================================================
CREATE TABLE public.byow_admin_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.byow_sites(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.byow_messages(id) ON DELETE SET NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'safe',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX byow_admin_queue_status_idx ON public.byow_admin_queue(status, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.byow_admin_queue TO authenticated;
GRANT ALL ON public.byow_admin_queue TO service_role;

ALTER TABLE public.byow_admin_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage queue"
  ON public.byow_admin_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners see their own queue items"
  ON public.byow_admin_queue FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id);

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.byow_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER byow_sites_updated_at
  BEFORE UPDATE ON public.byow_sites
  FOR EACH ROW EXECUTE FUNCTION public.byow_set_updated_at();

CREATE TRIGGER byow_subscriptions_updated_at
  BEFORE UPDATE ON public.byow_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.byow_set_updated_at();
