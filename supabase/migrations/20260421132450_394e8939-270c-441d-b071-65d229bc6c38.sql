INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'dev@dehub.io'
ON CONFLICT DO NOTHING;