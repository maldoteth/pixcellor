import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const PROJECT_URL = Deno.env.get('SUPABASE_URL')!
const TRACK_BASE = `${PROJECT_URL}/functions/v1/broadcast-track`

function renderMergeTags(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const parts = String(key).split('.')
    let value: any = ctx
    for (const p of parts) value = value?.[p]
    return value == null ? '' : String(value)
  })
}

function injectTracking(html: string, sendId: string, trackOpens: boolean, trackClicks: boolean): string {
  let out = html
  if (trackClicks) {
    out = out.replace(/<a\b([^>]*?)href=(["'])(https?:\/\/[^"']+)\2/gi, (m, attrs, q, url) => {
      const wrapped = `${TRACK_BASE}/c/${sendId}?u=${encodeURIComponent(url)}`
      return `<a${attrs}href=${q}${wrapped}${q}`
    })
  }
  if (trackOpens) {
    const pixel = `<img src="${TRACK_BASE}/o/${sendId}.gif" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px" />`
    if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${pixel}</body>`)
    else out += pixel
  }
  return out
}

function toPlainText(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const admin = createClient(PROJECT_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const anon = createClient(PROJECT_URL, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: userData } = await anon.auth.getUser()
    if (!userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const userId = userData.user.id

    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? 'send')
    const campaignId = String(body.campaign_id ?? '')

    // Load campaign
    const { data: campaign, error: cerr } = await admin
      .from('client_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .maybeSingle()
    if (cerr || !campaign) return new Response(JSON.stringify({ error: 'Campaign not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Load domain
    const { data: domain } = await admin
      .from('client_email_domains')
      .select('*')
      .eq('id', campaign.domain_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (!domain || domain.status !== 'verified') {
      return new Response(JSON.stringify({ error: 'Sender domain is not verified' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Quota + addon check
    const { data: addon } = await admin.from('client_email_addon').select('*').eq('user_id', userId).maybeSingle()
    if (!addon?.active) {
      return new Response(JSON.stringify({ error: 'Email add-on is not active. Upgrade to send campaigns.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'test') {
      const to = String(body.test_email ?? '').trim().toLowerCase()
      if (!to) return new Response(JSON.stringify({ error: 'Missing test_email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const html = renderMergeTags(campaign.template_html, { first_name: 'Test', last_name: 'User', email: to })
      const messageId = crypto.randomUUID()
      const { error: enq } = await admin.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          run_id: messageId,
          message_id: messageId,
          to,
          from: `${campaign.from_name} <${campaign.from_email}>`,
          reply_to: campaign.reply_to || campaign.from_email,
          sender_domain: domain.domain,
          subject: `[TEST] ${campaign.subject}`,
          html,
          text: toPlainText(html),
          purpose: 'transactional',
          label: 'broadcast-test',
          queued_at: new Date().toISOString(),
        },
      })
      if (enq) throw enq
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Load subscribed contacts
    const { data: contacts, error: conErr } = await admin
      .from('client_contacts')
      .select('id,email,first_name,last_name,custom_fields')
      .eq('user_id', userId)
      .eq('list_id', campaign.list_id)
      .eq('status', 'subscribed')
    if (conErr) throw conErr
    if (!contacts?.length) {
      return new Response(JSON.stringify({ error: 'No subscribed contacts in the selected list' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Suppression list
    const { data: suppressed } = await admin
      .from('client_email_suppressions')
      .select('email')
      .eq('user_id', userId)
    const suppressSet = new Set((suppressed ?? []).map((r) => r.email.toLowerCase()))
    const targets = contacts.filter((c) => !suppressSet.has(c.email.toLowerCase()))

    // Quota
    const remaining = (addon.monthly_send_quota ?? 0) - (addon.sent_this_period ?? 0)
    if (targets.length > remaining) {
      return new Response(JSON.stringify({ error: `Send exceeds your monthly quota (${remaining} remaining, need ${targets.length}). Upgrade your plan.` }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await admin
      .from('client_campaigns')
      .update({ status: 'sending', sending_started_at: new Date().toISOString(), total_recipients: targets.length })
      .eq('id', campaignId)

    // Create send rows in a batch
    const sendRows = targets.map((c) => ({
      id: crypto.randomUUID(),
      campaign_id: campaignId,
      user_id: userId,
      contact_id: c.id,
      recipient_email: c.email,
      status: 'pending' as const,
    }))
    // insert in chunks of 500
    for (let i = 0; i < sendRows.length; i += 500) {
      await admin.from('client_campaign_sends').insert(sendRows.slice(i, i + 500))
    }

    // Enqueue emails
    let enqueued = 0
    for (const send of sendRows) {
      const contact = targets.find((c) => c.id === send.contact_id)!
      const ctx = {
        first_name: contact.first_name ?? '',
        last_name: contact.last_name ?? '',
        email: contact.email,
        ...(contact.custom_fields as Record<string, unknown> ?? {}),
      }
      const bodyHtml = renderMergeTags(campaign.template_html, ctx)
      const tracked = injectTracking(bodyHtml, send.id, campaign.track_opens, campaign.track_clicks)
      const subject = renderMergeTags(campaign.subject, ctx)
      const { error } = await admin.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          run_id: send.id,
          message_id: send.id,
          to: contact.email,
          from: `${campaign.from_name} <${campaign.from_email}>`,
          reply_to: campaign.reply_to || campaign.from_email,
          sender_domain: domain.domain,
          subject,
          html: tracked,
          text: toPlainText(tracked),
          purpose: 'transactional',
          label: `broadcast:${campaignId}`,
          headers: {
            'List-Unsubscribe': `<${PROJECT_URL}/functions/v1/broadcast-track/u/${send.id}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          queued_at: new Date().toISOString(),
        },
      })
      if (!error) enqueued += 1
    }

    // Update campaign + addon usage
    await admin.from('client_campaigns').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      total_sent: enqueued,
    }).eq('id', campaignId)

    await admin.from('client_email_addon').update({
      sent_this_period: (addon.sent_this_period ?? 0) + enqueued,
    }).eq('user_id', userId)

    return new Response(JSON.stringify({ success: true, enqueued }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
