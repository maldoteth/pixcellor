-- 1. Helper: generate a random 6-char uppercase alphanumeric code (no ambiguous chars)
CREATE OR REPLACE FUNCTION public.gen_meeting_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 chars, removed 0,O,1,I,L
  code text;
  i int;
BEGIN
  code := '';
  FOR i IN 1..6 LOOP
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- 2. Add columns
ALTER TABLE public.call_bookings
  ADD COLUMN IF NOT EXISTS host_code text,
  ADD COLUMN IF NOT EXISTS guest_code text;

-- 3. Backfill, retrying on the (extremely rare) collision
DO $$
DECLARE
  r record;
  attempt int;
  new_code text;
BEGIN
  FOR r IN SELECT id FROM public.call_bookings WHERE host_code IS NULL OR guest_code IS NULL LOOP
    -- host
    IF (SELECT host_code FROM public.call_bookings WHERE id = r.id) IS NULL THEN
      attempt := 0;
      LOOP
        new_code := public.gen_meeting_code();
        BEGIN
          UPDATE public.call_bookings SET host_code = new_code WHERE id = r.id;
          EXIT;
        EXCEPTION WHEN unique_violation THEN
          attempt := attempt + 1;
          IF attempt > 10 THEN RAISE; END IF;
        END;
      END LOOP;
    END IF;
    -- guest
    IF (SELECT guest_code FROM public.call_bookings WHERE id = r.id) IS NULL THEN
      attempt := 0;
      LOOP
        new_code := public.gen_meeting_code();
        BEGIN
          UPDATE public.call_bookings SET guest_code = new_code WHERE id = r.id;
          EXIT;
        EXCEPTION WHEN unique_violation THEN
          attempt := attempt + 1;
          IF attempt > 10 THEN RAISE; END IF;
        END;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 4. Enforce non-null + unique
ALTER TABLE public.call_bookings
  ALTER COLUMN host_code SET NOT NULL,
  ALTER COLUMN guest_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS call_bookings_host_code_idx ON public.call_bookings (host_code);
CREATE UNIQUE INDEX IF NOT EXISTS call_bookings_guest_code_idx ON public.call_bookings (guest_code);

-- 5. Trigger to auto-fill on insert
CREATE OR REPLACE FUNCTION public.tg_call_bookings_fill_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt int;
  new_code text;
BEGIN
  IF NEW.host_code IS NULL THEN
    attempt := 0;
    LOOP
      new_code := public.gen_meeting_code();
      IF NOT EXISTS (SELECT 1 FROM public.call_bookings WHERE host_code = new_code OR guest_code = new_code) THEN
        NEW.host_code := new_code;
        EXIT;
      END IF;
      attempt := attempt + 1;
      IF attempt > 20 THEN RAISE EXCEPTION 'could not generate unique host_code'; END IF;
    END LOOP;
  END IF;
  IF NEW.guest_code IS NULL THEN
    attempt := 0;
    LOOP
      new_code := public.gen_meeting_code();
      IF NOT EXISTS (SELECT 1 FROM public.call_bookings WHERE host_code = new_code OR guest_code = new_code) THEN
        NEW.guest_code := new_code;
        EXIT;
      END IF;
      attempt := attempt + 1;
      IF attempt > 20 THEN RAISE EXCEPTION 'could not generate unique guest_code'; END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS call_bookings_fill_codes ON public.call_bookings;
CREATE TRIGGER call_bookings_fill_codes
  BEFORE INSERT ON public.call_bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_call_bookings_fill_codes();