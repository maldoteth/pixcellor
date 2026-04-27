REVOKE ALL ON FUNCTION public.ensure_admin_role_for_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_admin_role_for_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.ensure_admin_role_for_email(text) FROM authenticated;