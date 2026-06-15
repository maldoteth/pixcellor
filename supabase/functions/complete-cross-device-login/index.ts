import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

const BodySchema = z.object({
  sid: z.string().min(16).max(128),
}).passthrough();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const email = (claimsData.claims.email as string | undefined)?.toLowerCase();
    if (!email) return json({ error: 'No email on session' }, 400);

    const rawBody = await req.json().catch(() => ({}));
    const parsedBody = BodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return json({ error: 'Invalid handoff id' }, 400);
    }
    const sid = parsedBody.data.sid.trim();
    if (!sid || sid.length < 16 || sid.length > 128) {
      return json({ error: 'Invalid handoff id' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Generate a one-time magic link for this email. The desktop gets the
    // full action URL so the auth callback can persist the session exactly
    // like a clicked email link; the token hash is retained as fallback.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${new URL(req.url).origin}/auth/handoff` },
    });
    if (linkErr || !linkData?.properties?.hashed_token || !linkData?.properties?.action_link) {
      console.error('generateLink failed', linkErr);
      return json({ error: 'Could not mint handoff token' }, 500);
    }

    const tokenHash = linkData.properties.hashed_token;
    const loginUrl = linkData.properties.action_link;

    // Upsert the handoff row.
    const { error: upsertErr } = await admin
      .from('login_handoffs')
      .upsert({
        id: sid,
        email,
        token: tokenHash,
        login_url: loginUrl,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    if (upsertErr) {
      console.error('upsert failed', upsertErr);
      return json({ error: 'Could not store handoff' }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
