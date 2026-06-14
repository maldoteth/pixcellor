
CREATE TABLE public.call_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text,
  brief text,
  preference text NOT NULL DEFAULT 'specific',
  scheduled_at timestamptz,
  timezone text NOT NULL DEFAULT 'Europe/London',
  status text NOT NULL DEFAULT 'confirmed',
  source text NOT NULL DEFAULT 'ads_landing',
  contact_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX call_bookings_unique_slot
  ON public.call_bookings (scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status <> 'cancelled';

CREATE INDEX call_bookings_scheduled_at_idx ON public.call_bookings (scheduled_at);
CREATE INDEX call_bookings_email_idx ON public.call_bookings (lower(email));

GRANT ALL ON public.call_bookings TO service_role;

ALTER TABLE public.call_bookings ENABLE ROW LEVEL SECURITY;

-- Admins can view all bookings
CREATE POLICY "Admins can view all call bookings"
  ON public.call_bookings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tg_call_bookings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER call_bookings_set_updated_at
  BEFORE UPDATE ON public.call_bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_call_bookings_updated_at();
