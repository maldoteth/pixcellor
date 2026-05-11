import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401)
    const { data: isAdmin } = await userClient.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    })
    if (!isAdmin) return json({ error: 'Admin access required' }, 403)

    const body = await req.json().catch(() => null) as
      | { previewId?: string; recipientEmail?: string; clientName?: string; title?: string; brief?: string; previewUrl?: string; imageUrl?: string }
      | null
    if (!body?.previewId || !body.recipientEmail) {
      return json({ error: 'previewId and recipientEmail required' }, 400)
    }

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        templateName: 'vision-preview-ready',
        recipientEmail: body.recipientEmail,
        idempotencyKey: `vision-preview-${body.previewId}-${Date.now()}`,
        templateData: {
          clientName: body.clientName,
          title: body.title,
          brief: body.brief,
          previewUrl: body.previewUrl,
          imageUrl: body.imageUrl,
        },
      }),
    })

    const text = await resp.text()
    if (!resp.ok) {
      console.error('send-transactional-email failed', resp.status, text)
      return json({ error: text || 'Send failed' }, resp.status)
    }
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})
