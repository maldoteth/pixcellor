
-- 1. login_handoffs: drop permissive SELECT, add SECURITY DEFINER claim RPC
DROP POLICY IF EXISTS "Public can read handoff by nonce" ON public.login_handoffs;

CREATE OR REPLACE FUNCTION public.claim_login_handoff(_sid text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.login_handoffs%ROWTYPE;
BEGIN
  IF _sid IS NULL OR length(_sid) < 16 OR length(_sid) > 128 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO row FROM public.login_handoffs WHERE id = _sid LIMIT 1;
  IF NOT FOUND OR row.token IS NULL THEN
    RETURN NULL;
  END IF;
  IF row.expires_at IS NOT NULL AND row.expires_at < now() THEN
    DELETE FROM public.login_handoffs WHERE id = _sid;
    RETURN NULL;
  END IF;
  IF row.claimed_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.login_handoffs SET claimed_at = now() WHERE id = _sid;
  RETURN jsonb_build_object('token', row.token);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_login_handoff(text) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_login_handoff(text) TO anon, authenticated;

-- Remove from realtime publication (anon would no longer see updates anyway)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.login_handoffs;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. vision_previews: drop public SELECT, admin-only direct + slug RPC
DROP POLICY IF EXISTS "Anyone can view vision previews" ON public.vision_previews;

CREATE POLICY "Admins can view vision previews"
  ON public.vision_previews
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.get_vision_preview_by_slug(_slug text)
RETURNS TABLE(slug text, title text, brief text, image_path text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT slug, title, brief, image_path, created_at
  FROM public.vision_previews
  WHERE slug = _slug
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_vision_preview_by_slug(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_vision_preview_by_slug(text) TO anon, authenticated;

-- 3. Prune realtime publication of sensitive tables
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.stripe_checkout_sessions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.client_profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.contact_inquiries; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.contacts; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.contact_events; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.project_status; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_alerts; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Drop legacy portal_* overloads using hard-coded access code
DROP FUNCTION IF EXISTS public.portal_fetch_snapshot(text);
DROP FUNCTION IF EXISTS public.portal_fetch_messages(text, uuid);
DROP FUNCTION IF EXISTS public.portal_send_chat_reply(text, uuid, text);
DROP FUNCTION IF EXISTS public.portal_close_chat_case(text, uuid);
DROP FUNCTION IF EXISTS public.portal_complete_callback(text, uuid);
DROP FUNCTION IF EXISTS public.portal_update_contact(text, uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.portal_update_contact_status(text, uuid, text);
DROP FUNCTION IF EXISTS public.portal_create_contact(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.portal_require_access(text);
