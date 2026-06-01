import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const auth = req.headers.get('Authorization') ?? ''

  // Verify caller is an admin
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  })
  const { data: userRes, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userRes?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { data: isAdmin } = await userClient.rpc('has_role', {
    _user_id: userRes.user.id, _role: 'admin',
  })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let logId: string | undefined
  try {
    const body = await req.json()
    logId = body.logId || body.id
  } catch {}
  if (!logId) {
    return new Response(JSON.stringify({ error: 'logId required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: row, error } = await admin
    .from('email_send_log')
    .select('template_name, recipient_email, metadata, created_at, status')
    .eq('id', logId)
    .maybeSingle()

  if (error || !row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const entry = TEMPLATES[row.template_name]
  if (!entry) {
    return new Response(JSON.stringify({
      error: `Unknown template "${row.template_name}"`,
      recipient: row.recipient_email,
    }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const meta = (row.metadata ?? {}) as Record<string, any>
  const data = (meta.template_data && typeof meta.template_data === 'object')
    ? meta.template_data
    : (entry.previewData ?? {})
  const usedPreviewFallback = !meta.template_data

  let html = ''
  let subject = ''
  let renderError: string | undefined
  try {
    html = await renderAsync(React.createElement(entry.component, data))
    subject = typeof entry.subject === 'function' ? entry.subject(data) : entry.subject
  } catch (err) {
    renderError = err instanceof Error ? err.message : String(err)
  }

  return new Response(JSON.stringify({
    subject,
    html,
    recipient: row.recipient_email,
    template: row.template_name,
    status: row.status,
    createdAt: row.created_at,
    usedPreviewFallback,
    renderError,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
