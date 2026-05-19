
-- Settings (singleton)
CREATE TABLE public.sms_settings (
  id integer PRIMARY KEY DEFAULT 1,
  sender_id text,
  footer text NOT NULL DEFAULT 'Reply STOP to opt out',
  rate_per_second integer NOT NULL DEFAULT 5,
  quiet_hours_start integer NOT NULL DEFAULT 21,
  quiet_hours_end integer NOT NULL DEFAULT 8,
  enforce_quiet_hours boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_settings_singleton CHECK (id = 1)
);

INSERT INTO public.sms_settings (id) VALUES (1);

-- Broadcasts
CREATE TABLE public.sms_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  body text NOT NULL,
  sender_id text,
  status text NOT NULL DEFAULT 'draft', -- draft|queued|sending|sent|failed|canceled
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  reply_count integer NOT NULL DEFAULT 0,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by_user_id uuid,
  created_by_email text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Per-recipient messages (outbound + inbound trace)
CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid REFERENCES public.sms_broadcasts(id) ON DELETE SET NULL,
  contact_id uuid,
  contact_person_id uuid,
  direction text NOT NULL DEFAULT 'outbound', -- outbound|inbound
  to_phone text,
  from_phone text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued', -- queued|sending|sent|delivered|failed|undelivered|received
  twilio_sid text UNIQUE,
  error_code text,
  error_message text,
  segments integer,
  price numeric,
  price_unit text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_messages_broadcast ON public.sms_messages(broadcast_id);
CREATE INDEX idx_sms_messages_status ON public.sms_messages(status);
CREATE INDEX idx_sms_messages_contact ON public.sms_messages(contact_id);
CREATE INDEX idx_sms_messages_to_phone ON public.sms_messages(to_phone);

-- Inbound replies (denormalized for inbox view)
CREATE TABLE public.sms_inbound_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.sms_messages(id) ON DELETE CASCADE,
  contact_id uuid,
  from_phone text NOT NULL,
  to_phone text,
  body text NOT NULL,
  handled boolean NOT NULL DEFAULT false,
  handled_at timestamptz,
  handled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_inbound_replies_handled ON public.sms_inbound_replies(handled);
CREATE INDEX idx_sms_inbound_replies_contact ON public.sms_inbound_replies(contact_id);

-- Opt-outs (UK PECR compliance)
CREATE TABLE public.sms_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT 'STOP',
  source text NOT NULL DEFAULT 'sms_reply', -- sms_reply|manual|complaint
  contact_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_opt_outs_phone ON public.sms_opt_outs(phone);

-- Enable RLS
ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_inbound_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_opt_outs ENABLE ROW LEVEL SECURITY;

-- Policies: admins manage, service role full access
CREATE POLICY "Admins manage sms settings" ON public.sms_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages sms settings" ON public.sms_settings
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins manage sms broadcasts" ON public.sms_broadcasts
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages sms broadcasts" ON public.sms_broadcasts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins manage sms messages" ON public.sms_messages
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages sms messages" ON public.sms_messages
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins manage sms replies" ON public.sms_inbound_replies
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages sms replies" ON public.sms_inbound_replies
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins manage sms opt outs" ON public.sms_opt_outs
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages sms opt outs" ON public.sms_opt_outs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- updated_at triggers
CREATE TRIGGER set_sms_broadcasts_updated_at BEFORE UPDATE ON public.sms_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_sms_messages_updated_at BEFORE UPDATE ON public.sms_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable pg_cron + pg_net for queue worker
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
