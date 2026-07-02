
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.broadcast_plan AS ENUM ('starter', 'growth', 'scale');
CREATE TYPE public.broadcast_domain_status AS ENUM ('pending', 'partial', 'verified', 'failed');
CREATE TYPE public.broadcast_contact_status AS ENUM ('subscribed', 'unsubscribed', 'bounced', 'complained');
CREATE TYPE public.broadcast_campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'paused', 'failed');
CREATE TYPE public.broadcast_send_status AS ENUM ('pending', 'sent', 'delivered', 'bounced', 'failed', 'suppressed');

-- ============================================================
-- Reusable updated_at trigger fn (safe if already exists)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. client_email_addon
-- ============================================================
CREATE TABLE public.client_email_addon (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.broadcast_plan NOT NULL DEFAULT 'starter',
  active BOOLEAN NOT NULL DEFAULT false,
  monthly_send_quota INTEGER NOT NULL DEFAULT 0,
  sent_this_period INTEGER NOT NULL DEFAULT 0,
  max_domains INTEGER NOT NULL DEFAULT 1,
  max_contacts INTEGER NOT NULL DEFAULT 1000,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  period_started_at TIMESTAMPTZ,
  period_ends_at TIMESTAMPTZ,
  postal_address TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_email_addon TO authenticated;
GRANT ALL ON public.client_email_addon TO service_role;
ALTER TABLE public.client_email_addon ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addon owner read" ON public.client_email_addon FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "addon owner upsert" ON public.client_email_addon FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "addon owner update" ON public.client_email_addon FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_client_email_addon_updated_at BEFORE UPDATE ON public.client_email_addon
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. client_email_domains
-- ============================================================
CREATE TABLE public.client_email_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  status public.broadcast_domain_status NOT NULL DEFAULT 'pending',
  spf_ok BOOLEAN NOT NULL DEFAULT false,
  dkim_ok BOOLEAN NOT NULL DEFAULT false,
  dmarc_ok BOOLEAN NOT NULL DEFAULT false,
  mx_ok BOOLEAN NOT NULL DEFAULT false,
  dkim_selector TEXT NOT NULL DEFAULT 'pxc',
  dkim_public_key TEXT,
  dkim_private_key TEXT, -- server-side only via service role
  verification_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  verified_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, domain)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_email_domains TO authenticated;
GRANT ALL ON public.client_email_domains TO service_role;
ALTER TABLE public.client_email_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "domain owner all" ON public.client_email_domains FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_client_email_domains_updated_at BEFORE UPDATE ON public.client_email_domains
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. client_contact_lists
-- ============================================================
CREATE TABLE public.client_contact_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  contact_count INTEGER NOT NULL DEFAULT 0,
  subscribed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contact_lists TO authenticated;
GRANT ALL ON public.client_contact_lists TO service_role;
ALTER TABLE public.client_contact_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "list owner all" ON public.client_contact_lists FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_client_contact_lists_updated_at BEFORE UPDATE ON public.client_contact_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. client_contacts
-- ============================================================
CREATE TABLE public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID REFERENCES public.client_contact_lists(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.broadcast_contact_status NOT NULL DEFAULT 'subscribed',
  consent_source TEXT,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  bounce_reason TEXT,
  last_opened_hour SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, list_id, email)
);
CREATE INDEX idx_client_contacts_user_list ON public.client_contacts(user_id, list_id);
CREATE INDEX idx_client_contacts_email ON public.client_contacts(user_id, email);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contacts TO authenticated;
GRANT ALL ON public.client_contacts TO service_role;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact owner all" ON public.client_contacts FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_client_contacts_updated_at BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. client_email_suppressions
-- ============================================================
CREATE TABLE public.client_email_suppressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT NOT NULL, -- 'unsubscribe' | 'bounce' | 'complaint' | 'manual'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, email)
);
GRANT SELECT, INSERT, DELETE ON public.client_email_suppressions TO authenticated;
GRANT ALL ON public.client_email_suppressions TO service_role;
ALTER TABLE public.client_email_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppression owner all" ON public.client_email_suppressions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. client_campaigns
-- ============================================================
CREATE TABLE public.client_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID REFERENCES public.client_contact_lists(id) ON DELETE SET NULL,
  domain_id UUID REFERENCES public.client_email_domains(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  preheader TEXT,
  from_name TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  reply_to TEXT,
  template_html TEXT NOT NULL DEFAULT '',
  template_json JSONB,
  plain_text TEXT,
  status public.broadcast_campaign_status NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  sending_started_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  track_opens BOOLEAN NOT NULL DEFAULT true,
  track_clicks BOOLEAN NOT NULL DEFAULT true,
  ab_test_enabled BOOLEAN NOT NULL DEFAULT false,
  ab_subject_b TEXT,
  ab_split_pct SMALLINT NOT NULL DEFAULT 10,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_delivered INTEGER NOT NULL DEFAULT 0,
  total_opened INTEGER NOT NULL DEFAULT 0,
  total_clicked INTEGER NOT NULL DEFAULT 0,
  total_bounced INTEGER NOT NULL DEFAULT 0,
  total_unsubscribed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_campaigns_user_status ON public.client_campaigns(user_id, status);
CREATE INDEX idx_client_campaigns_scheduled ON public.client_campaigns(status, scheduled_for) WHERE status = 'scheduled';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_campaigns TO authenticated;
GRANT ALL ON public.client_campaigns TO service_role;
ALTER TABLE public.client_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign owner all" ON public.client_campaigns FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_client_campaigns_updated_at BEFORE UPDATE ON public.client_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7. client_campaign_sends
-- ============================================================
CREATE TABLE public.client_campaign_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.client_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.client_contacts(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  message_id TEXT,
  status public.broadcast_send_status NOT NULL DEFAULT 'pending',
  ab_variant CHAR(1), -- 'A' or 'B'
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  open_count INTEGER NOT NULL DEFAULT 0,
  first_click_at TIMESTAMPTZ,
  click_count INTEGER NOT NULL DEFAULT 0,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaign_sends_campaign ON public.client_campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_user ON public.client_campaign_sends(user_id);
GRANT SELECT ON public.client_campaign_sends TO authenticated;
GRANT ALL ON public.client_campaign_sends TO service_role;
ALTER TABLE public.client_campaign_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "send owner read" ON public.client_campaign_sends FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 8. client_campaign_events
-- ============================================================
CREATE TABLE public.client_campaign_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  send_id UUID NOT NULL REFERENCES public.client_campaign_sends(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.client_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'open' | 'click' | 'bounce' | 'complaint' | 'unsubscribe' | 'delivered'
  url TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaign_events_campaign ON public.client_campaign_events(campaign_id, event_type);
CREATE INDEX idx_campaign_events_send ON public.client_campaign_events(send_id);
GRANT SELECT ON public.client_campaign_events TO authenticated;
GRANT ALL ON public.client_campaign_events TO service_role;
ALTER TABLE public.client_campaign_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event owner read" ON public.client_campaign_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 9. client_email_replies
-- ============================================================
CREATE TABLE public.client_email_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.client_campaigns(id) ON DELETE SET NULL,
  send_id UUID REFERENCES public.client_campaign_sends(id) ON DELETE SET NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  provider_message_id TEXT,
  in_reply_to TEXT,
  handled BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_replies_campaign ON public.client_email_replies(campaign_id);
CREATE INDEX idx_email_replies_user ON public.client_email_replies(user_id, handled);
GRANT SELECT, UPDATE ON public.client_email_replies TO authenticated;
GRANT ALL ON public.client_email_replies TO service_role;
ALTER TABLE public.client_email_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reply owner read" ON public.client_email_replies FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reply owner update" ON public.client_email_replies FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- pgmq queue for broadcast emails
-- ============================================================
DO $$
BEGIN
  PERFORM pgmq.create('broadcast_emails');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- Helper: refresh contact list counts
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_contact_list_counts(_list_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.client_contact_lists l
  SET contact_count = (SELECT count(*) FROM public.client_contacts WHERE list_id = _list_id),
      subscribed_count = (SELECT count(*) FROM public.client_contacts WHERE list_id = _list_id AND status = 'subscribed')
  WHERE l.id = _list_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_client_contacts_touch_list()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_contact_list_counts(OLD.list_id);
    RETURN OLD;
  ELSE
    PERFORM public.refresh_contact_list_counts(NEW.list_id);
    IF TG_OP = 'UPDATE' AND OLD.list_id IS DISTINCT FROM NEW.list_id AND OLD.list_id IS NOT NULL THEN
      PERFORM public.refresh_contact_list_counts(OLD.list_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_client_contacts_count
AFTER INSERT OR UPDATE OR DELETE ON public.client_contacts
FOR EACH ROW EXECUTE FUNCTION public.trg_client_contacts_touch_list();
