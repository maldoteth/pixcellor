import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.57.2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

const TIER_QUOTA: Record<string, number> = { care: 25, studio: 180, agency: 1000 };

interface Body {
  client_email: string;
  display_name: string;
  published_url?: string;
  lovable_preview_url?: string;
  lovable_project_id?: string;
  tier: 'care' | 'studio' | 'agency';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: ud, error: uErr } = await userClient.auth.getUser();
    if (uErr || !ud.user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Admin role check
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', ud.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) return json({ error: 'Admin access required' }, 403);

    const body = await req.json() as Body;
    if (!body.client_email || !body.display_name || !body.tier) {
      return json({ error: 'Missing required fields' }, 400);
    }
    if (!TIER_QUOTA[body.tier]) return json({ error: 'Invalid tier' }, 400);

    // Find or create the user via admin auth API
    const email = body.client_email.trim().toLowerCase();
    let ownerUserId: string | null = null;

    // Paginate auth.admin.listUsers to find by email
    let page = 1;
    while (page <= 20) {
      const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (lErr) break;
      const hit = list.users.find((u) => (u.email || '').toLowerCase() === email);
      if (hit) { ownerUserId = hit.id; break; }
      if (!list.users.length || list.users.length < 200) break;
      page++;
    }

    if (!ownerUserId) {
      // Invite them
      const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email);
      if (invErr || !invited.user) {
        return json({ error: `Could not invite ${email}: ${invErr?.message || 'unknown error'}` }, 400);
      }
      ownerUserId = invited.user.id;
    }

    // Create site
    const { data: site, error: sErr } = await admin
      .from('byow_sites')
      .insert({
        owner_user_id: ownerUserId,
        display_name: body.display_name.trim(),
        published_url: body.published_url?.trim() || null,
        lovable_preview_url: body.lovable_preview_url?.trim() || null,
        lovable_project_id: body.lovable_project_id?.trim() || null,
      })
      .select()
      .single();
    if (sErr) throw sErr;

    // Create subscription
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { error: subErr } = await admin.from('byow_subscriptions').insert({
      site_id: site.id,
      owner_user_id: ownerUserId,
      tier: body.tier,
      status: 'active',
      prompt_quota: TIER_QUOTA[body.tier],
      prompts_used: 0,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    });
    if (subErr) throw subErr;

    return json({ ok: true, site_id: site.id, owner_user_id: ownerUserId, invited: true }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[byow-admin-create-site]', msg);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
