import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.57.2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

interface Body {
  site_id: string;
  prompt: string;
  mode?: 'safe' | 'full';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const body = await req.json() as Body;
    const prompt = (body.prompt || '').trim();
    const mode = body.mode === 'full' ? 'full' : 'safe';
    if (!body.site_id || !prompt) {
      return new Response(JSON.stringify({ error: 'Missing site_id or prompt' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (prompt.length > 4000) {
      return new Response(JSON.stringify({ error: 'Prompt too long (max 4000 chars)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Verify ownership
    const { data: site, error: siteErr } = await admin
      .from('byow_sites')
      .select('id, owner_user_id, display_name, status')
      .eq('id', body.site_id)
      .maybeSingle();
    if (siteErr || !site) {
      return new Response(JSON.stringify({ error: 'Site not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (site.owner_user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (site.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Site is paused. Contact support.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Quota check
    const { data: sub } = await admin
      .from('byow_subscriptions')
      .select('*')
      .eq('site_id', body.site_id)
      .maybeSingle();

    if (!sub || sub.status !== 'active') {
      return new Response(JSON.stringify({
        error: 'No active subscription. Please choose a plan to start sending edit requests.',
        code: 'no_subscription',
      }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (sub.prompts_used >= sub.prompt_quota) {
      return new Response(JSON.stringify({
        error: `You've used all ${sub.prompt_quota} prompts in this period. Upgrade your plan or wait until ${sub.current_period_end}.`,
        code: 'quota_exceeded',
      }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Full mode requires studio or agency
    if (mode === 'full' && sub.tier === 'care') {
      return new Response(JSON.stringify({
        error: 'Full edit mode is available on Studio and Agency plans only.',
        code: 'mode_not_allowed',
      }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert user message
    const { data: userMsg, error: umErr } = await admin
      .from('byow_messages')
      .insert({
        site_id: body.site_id,
        owner_user_id: user.id,
        role: 'user',
        content: prompt,
        mode,
        status: 'done',
        credits_cost: 1,
      })
      .select()
      .single();
    if (umErr) throw umErr;

    // Insert into admin queue (queue mode — MCP swap comes later)
    const { data: queueItem, error: qErr } = await admin
      .from('byow_admin_queue')
      .insert({
        site_id: body.site_id,
        message_id: userMsg.id,
        owner_user_id: user.id,
        prompt,
        mode,
        status: 'pending',
      })
      .select()
      .single();
    if (qErr) throw qErr;

    // Deduct quota
    await admin
      .from('byow_subscriptions')
      .update({ prompts_used: sub.prompts_used + 1 })
      .eq('id', sub.id);

    // Assistant ack message
    const ack = mode === 'safe'
      ? `Got it — your edit request is in. Our team will action this within 1 business day and your preview will refresh automatically when it's live. You'll see the change on the right.`
      : `Got it — your full edit request is in. These are more involved so we'll typically have changes live within 1–2 business days. The preview on the right updates automatically.`;

    const { data: assistantMsg } = await admin
      .from('byow_messages')
      .insert({
        site_id: body.site_id,
        owner_user_id: user.id,
        role: 'assistant',
        content: ack,
        mode,
        status: 'queued',
        credits_cost: 0,
        metadata: { queue_item_id: queueItem.id },
      })
      .select()
      .single();

    return new Response(JSON.stringify({
      ok: true,
      user_message: userMsg,
      assistant_message: assistantMsg,
      prompts_remaining: sub.prompt_quota - sub.prompts_used - 1,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[byow-submit-prompt] error', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
