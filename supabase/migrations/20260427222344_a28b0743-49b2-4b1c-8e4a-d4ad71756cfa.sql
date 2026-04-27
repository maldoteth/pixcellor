CREATE OR REPLACE FUNCTION public.ensure_admin_role_for_email(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower(_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

SELECT public.ensure_admin_role_for_email('erika@gmail.com');