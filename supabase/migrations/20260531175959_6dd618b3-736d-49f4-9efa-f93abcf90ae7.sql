DO $$
BEGIN
  IF to_regclass('public.customer_lead_sources') IS NULL THEN
    IF to_regclass('public.partner_accounts') IS NOT NULL THEN
      ALTER TABLE public.partner_accounts RENAME TO customer_lead_sources;
    ELSE
      CREATE TABLE public.customer_lead_sources (
        email text PRIMARY KEY,
        source_key text NOT NULL,
        label text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    END IF;
  END IF;
END $$;

GRANT SELECT ON public.customer_lead_sources TO authenticated;
GRANT ALL ON public.customer_lead_sources TO service_role;

ALTER TABLE public.customer_lead_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage partner accounts" ON public.customer_lead_sources;
DROP POLICY IF EXISTS "Users see own partner row" ON public.customer_lead_sources;
DROP POLICY IF EXISTS "Admins manage customer lead sources" ON public.customer_lead_sources;
DROP POLICY IF EXISTS "Customers see own lead source" ON public.customer_lead_sources;

CREATE POLICY "Admins manage customer lead sources"
  ON public.customer_lead_sources FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers see own lead source"
  ON public.customer_lead_sources FOR SELECT
  TO authenticated
  USING (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), '')));

CREATE OR REPLACE FUNCTION public.customer_lead_source_for(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cls.source_key
    FROM public.customer_lead_sources cls
    JOIN auth.users u ON lower(u.email) = lower(cls.email)
   WHERE u.id = _user_id
   LIMIT 1
$$;

DROP POLICY IF EXISTS "Partners read own-source contacts" ON public.contacts;
DROP POLICY IF EXISTS "Customers read own-source contacts" ON public.contacts;

CREATE POLICY "Customers read own-source contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (
    public.customer_lead_source_for(auth.uid()) IS NOT NULL
    AND lower(source) = lower(public.customer_lead_source_for(auth.uid()))
  );

INSERT INTO public.customer_lead_sources (email, source_key, label)
VALUES ('dmbscaffoldingltd@outlook.com', 'dmb_scaffolding', 'DMB Scaffolding')
ON CONFLICT (email) DO UPDATE SET source_key = EXCLUDED.source_key, label = EXCLUDED.label;

CREATE OR REPLACE FUNCTION public.customer_fetch_portal()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_email text;
  uid uuid := auth.uid();
  lead_source text;
  result jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '28000';
  END IF;

  SELECT lower(email) INTO user_email FROM auth.users WHERE id = uid LIMIT 1;

  IF user_email IS NULL OR user_email = '' THEN
    RAISE EXCEPTION 'Account email required' USING ERRCODE = '28000';
  END IF;

  SELECT public.customer_lead_source_for(uid) INTO lead_source;

  SELECT jsonb_build_object(
    'email', user_email,
    'leadSource', coalesce((
      SELECT jsonb_build_object('email', cls.email, 'source_key', cls.source_key, 'label', cls.label)
      FROM public.customer_lead_sources cls
      WHERE lower(cls.email) = user_email
      LIMIT 1
    ), 'null'::jsonb),
    'leads', coalesce((
      SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC)
      FROM public.contacts c
      WHERE lead_source IS NOT NULL
        AND lower(c.source) = lower(lead_source)
    ), '[]'::jsonb),
    'orders', coalesce((
      SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC)
      FROM public.stripe_checkout_sessions s
      WHERE lower(coalesce(s.customer_email, '')) = user_email
    ), '[]'::jsonb),
    'projectRequirements', coalesce((
      SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.updated_at DESC)
      FROM public.project_requirements pr
      WHERE EXISTS (
        SELECT 1 FROM public.stripe_checkout_sessions s
        WHERE s.session_id = pr.session_id
          AND lower(coalesce(s.customer_email, '')) = user_email
      )
    ), '[]'::jsonb),
    'sampleRequests', coalesce((
      SELECT jsonb_agg(to_jsonb(l) ORDER BY l.created_at DESC)
      FROM public.lets_talk_leads l
      WHERE lower(coalesce(l.email, '')) = user_email
    ), '[]'::jsonb),
    'visionPreviews', coalesce((
      SELECT jsonb_agg(row_to_json(combined) ORDER BY combined.created_at DESC)
      FROM (
        SELECT v.id::text AS id, v.slug, v.title, v.brief, v.image_path, v.created_at
        FROM public.vision_previews v
        WHERE lower(coalesce(v.client_email, '')) = user_email
          AND NOT EXISTS (
            SELECT 1 FROM public.customer_hidden_visions h
            WHERE h.user_id = uid AND h.slug = v.slug
          )
        UNION ALL
        SELECT g.id::text AS id, g.preview_slug AS slug,
               coalesce(nullif(g.company,''), nullif(g.contact_name,''), 'AI vision') AS title,
               g.brief, g.storage_path AS image_path, g.created_at
        FROM public.ai_sample_generations g
        WHERE lower(coalesce(g.email, '')) = user_email
          AND g.preview_slug IS NOT NULL
          AND g.storage_path IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.vision_previews v2
            WHERE v2.slug = g.preview_slug
              AND lower(coalesce(v2.client_email, '')) = user_email
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.customer_hidden_visions h
            WHERE h.user_id = uid AND h.slug = g.preview_slug
          )
      ) combined
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;