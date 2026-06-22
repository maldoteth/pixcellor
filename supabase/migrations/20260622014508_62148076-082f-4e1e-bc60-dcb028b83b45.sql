
-- ============================================================
-- INVOICES: bank-transfer / "pay by invoice" system for Delabs Ltd
-- ============================================================

-- Sequence for human-readable invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

-- ----- invoices -----
CREATE TABLE public.invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number      TEXT NOT NULL UNIQUE,
  public_token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),

  -- relationships
  contact_id          UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  package_slug        TEXT,
  conversation_id     UUID, -- optional link to chat_conversations
  created_by_user_id  UUID,
  created_by_email    TEXT,
  source              TEXT NOT NULL DEFAULT 'public_checkout',
    -- one of: 'public_checkout' | 'alex_chat' | 'portal_manual' | 'api'

  -- status & lifecycle
  status              TEXT NOT NULL DEFAULT 'sent',
    -- one of: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'written_off'
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at              TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '28 days'),
  paid_at             TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancel_reason       TEXT,
  superseded_by_id    UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  first_viewed_at     TIMESTAMPTZ,
  last_viewed_at      TIMESTAMPTZ,
  view_count          INTEGER NOT NULL DEFAULT 0,

  -- amounts (all integer pence)
  subtotal_pence      BIGINT NOT NULL DEFAULT 0,
  total_pence         BIGINT NOT NULL DEFAULT 0,
  amount_paid_pence   BIGINT NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'gbp',

  -- billing snapshot (frozen at issue)
  billing_name        TEXT NOT NULL,
  billing_company     TEXT,
  billing_email       TEXT NOT NULL,
  billing_phone       TEXT,
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_city        TEXT,
  billing_postcode    TEXT,
  billing_country     TEXT DEFAULT 'United Kingdom',
  po_reference        TEXT,
  internal_note       TEXT,

  -- payment terms (label only; due_at is the canonical date)
  payment_terms_days  INTEGER NOT NULL DEFAULT 28,
  payment_terms_label TEXT NOT NULL DEFAULT 'Payment due within 28 days of issue',

  -- reminders
  reminder_stage      TEXT NOT NULL DEFAULT 'none',
    -- one of: 'none' | 'friendly' | 'second' | 'overdue' | 'final' | 'stopped'
  last_reminder_at    TIMESTAMPTZ,
  reminders_paused    BOOLEAN NOT NULL DEFAULT false,

  -- payment recording
  marked_paid_by      UUID,
  payment_reference   TEXT,
  payment_method      TEXT,
    -- e.g. 'bank_transfer' | 'cash' | 'card_offline' | 'cheque' | 'other'

  -- pdf
  pdf_generated_at    TIMESTAMPTZ,
  pdf_storage_path    TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_contact_id     ON public.invoices(contact_id);
CREATE INDEX idx_invoices_status         ON public.invoices(status);
CREATE INDEX idx_invoices_due_at         ON public.invoices(due_at);
CREATE INDEX idx_invoices_billing_email  ON public.invoices(lower(billing_email));
CREATE INDEX idx_invoices_created_at     ON public.invoices(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.invoice_number_seq TO authenticated, service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages invoices" ON public.invoices
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ----- invoice_line_items -----
CREATE TABLE public.invoice_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description       TEXT NOT NULL,
  quantity          NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_amount_pence BIGINT NOT NULL,
  line_total_pence  BIGINT NOT NULL,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_line_items TO authenticated;
GRANT ALL ON public.invoice_line_items TO service_role;

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invoice line items" ON public.invoice_line_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages invoice line items" ON public.invoice_line_items
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ----- invoice_events (audit log) -----
CREATE TABLE public.invoice_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
    -- 'issued' | 'viewed' | 'reminder_sent' | 'marked_paid' | 'cancelled'
    -- | 'pdf_generated' | 'note' | 'reissued' | 'reminders_paused' | 'reminders_resumed'
  actor_email TEXT,
  actor_user_id UUID,
  message     TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_events_invoice_id ON public.invoice_events(invoice_id, created_at DESC);

GRANT SELECT, INSERT ON public.invoice_events TO authenticated;
GRANT ALL ON public.invoice_events TO service_role;

ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read invoice events" ON public.invoice_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert invoice events" ON public.invoice_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages invoice events" ON public.invoice_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ----- updated_at triggers -----
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----- invoice number generator -----
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val BIGINT;
BEGIN
  next_val := nextval('public.invoice_number_seq');
  RETURN 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(next_val::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated, service_role;

-- ----- public lookup by token (used by /invoice/:token page) -----
CREATE OR REPLACE FUNCTION public.get_invoice_by_token(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  items JSONB;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE public_token = _token LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Record the view (best-effort)
  UPDATE public.invoices
     SET view_count      = view_count + 1,
         last_viewed_at  = now(),
         first_viewed_at = COALESCE(first_viewed_at, now()),
         status          = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
   WHERE id = inv.id;

  INSERT INTO public.invoice_events (invoice_id, event_type, message)
  VALUES (inv.id, 'viewed', 'Invoice viewed via hosted link');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', li.id,
    'description', li.description,
    'quantity', li.quantity,
    'unit_amount_pence', li.unit_amount_pence,
    'line_total_pence', li.line_total_pence,
    'sort_order', li.sort_order
  ) ORDER BY li.sort_order, li.created_at), '[]'::jsonb)
    INTO items
    FROM public.invoice_line_items li
   WHERE li.invoice_id = inv.id;

  RETURN jsonb_build_object(
    'id', inv.id,
    'invoice_number', inv.invoice_number,
    'status', inv.status,
    'issued_at', inv.issued_at,
    'due_at', inv.due_at,
    'paid_at', inv.paid_at,
    'currency', inv.currency,
    'subtotal_pence', inv.subtotal_pence,
    'total_pence', inv.total_pence,
    'amount_paid_pence', inv.amount_paid_pence,
    'billing_name', inv.billing_name,
    'billing_company', inv.billing_company,
    'billing_email', inv.billing_email,
    'billing_address_line1', inv.billing_address_line1,
    'billing_address_line2', inv.billing_address_line2,
    'billing_city', inv.billing_city,
    'billing_postcode', inv.billing_postcode,
    'billing_country', inv.billing_country,
    'po_reference', inv.po_reference,
    'payment_terms_label', inv.payment_terms_label,
    'package_slug', inv.package_slug,
    'pdf_storage_path', inv.pdf_storage_path,
    'line_items', items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invoice_by_token(TEXT) TO anon, authenticated, service_role;
