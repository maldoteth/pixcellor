
CREATE OR REPLACE FUNCTION public.grant_admin_to_known_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) IN ('samiadiamond@yahoo.com', 'dehub.bsc@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Also grant immediately if either user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) IN ('samiadiamond@yahoo.com', 'dehub.bsc@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
