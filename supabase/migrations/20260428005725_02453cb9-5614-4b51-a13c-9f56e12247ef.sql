ALTER TABLE public.stripe_checkout_sessions
ADD COLUMN IF NOT EXISTS order_code TEXT,
ADD COLUMN IF NOT EXISTS requirements_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS stripe_checkout_sessions_order_code_key
ON public.stripe_checkout_sessions (order_code)
WHERE order_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public'
AS $function$
DECLARE
  letters text := '';
  numbers text := '';
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  i integer;
BEGIN
  FOR i IN 1..4 LOOP
    letters := letters || substr(alphabet, floor(random() * length(alphabet) + 1)::integer, 1);
  END LOOP;

  numbers := lpad(floor(random() * 10000)::integer::text, 4, '0');
  RETURN 'PXC-' || letters || '-' || numbers;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_order_public_reference(_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_code text;
  existing_token text;
  new_code text;
  new_token text;
  attempts integer := 0;
BEGIN
  SELECT order_code, requirements_token
  INTO existing_code, existing_token
  FROM public.stripe_checkout_sessions
  WHERE session_id = _session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF existing_code IS NOT NULL AND existing_token IS NOT NULL THEN
    RETURN jsonb_build_object('order_code', existing_code, 'requirements_token', existing_token);
  END IF;

  new_token := coalesce(existing_token, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

  LOOP
    attempts := attempts + 1;
    new_code := coalesce(existing_code, public.generate_order_code());

    BEGIN
      UPDATE public.stripe_checkout_sessions
      SET order_code = coalesce(existing_code, new_code),
          requirements_token = new_token,
          updated_at = now()
      WHERE session_id = _session_id;

      RETURN jsonb_build_object('order_code', coalesce(existing_code, new_code), 'requirements_token', new_token);
    EXCEPTION WHEN unique_violation THEN
      IF attempts >= 20 THEN
        RAISE EXCEPTION 'Could not generate unique order code';
      END IF;
      existing_code := NULL;
    END;
  END LOOP;
END;
$function$;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT session_id FROM public.stripe_checkout_sessions
    WHERE order_code IS NULL OR requirements_token IS NULL
  LOOP
    PERFORM public.ensure_order_public_reference(rec.session_id);
  END LOOP;
END $$;