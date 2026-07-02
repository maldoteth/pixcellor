import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*' }

// 1x1 transparent gif
const PIXEL = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0))

async function sha256Hex(input: string) {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  // /broadcast-track/o/<sendId>.gif   /broadcast-track/c/<sendId>?u=<url>   /broadcast-track/u/<sendId>
  const kind = parts[parts.length - 2]
  const idPart = parts[parts.length - 1].replace(/\.gif$/, '')

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const ua = req.headers.get('user-agent') ?? ''
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const ipHash = ip ? await sha256Hex(ip) : null

  const { data: send } = await admin.from('client_campaign_sends').select('id, campaign_id, user_id, opened_at, first_click_at, contact_id, recipient_email').eq('id', idPart).maybeSingle()
  if (!send) {
    if (kind === 'o') return new Response(PIXEL, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } })
    return new Response('Not found', { status: 404, headers: corsHeaders })
  }

  if (kind === 'o') {
    await admin.from('client_campaign_events').insert({
      send_id: send.id, campaign_id: send.campaign_id, user_id: send.user_id,
      event_type: 'open', user_agent: ua, ip_hash: ipHash,
    })
    const patch: Record<string, unknown> = { open_count: undefined }
    if (!send.opened_at) patch.opened_at = new Date().toISOString()
    // increment open_count
    await admin.rpc('increment_send_opens', { _send_id: send.id }).catch(() => null)
    if (!send.opened_at) {
      await admin.from('client_campaign_sends').update({ opened_at: new Date().toISOString() }).eq('id', send.id)
      await admin.rpc('increment_campaign_stat', { _campaign_id: send.campaign_id, _field: 'total_opened' }).catch(() => null)
    }
    return new Response(PIXEL, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } })
  }

  if (kind === 'c') {
    const target = url.searchParams.get('u') ?? ''
    if (!target || !/^https?:\/\//i.test(target)) return new Response('Bad url', { status: 400, headers: corsHeaders })
    await admin.from('client_campaign_events').insert({
      send_id: send.id, campaign_id: send.campaign_id, user_id: send.user_id,
      event_type: 'click', url: target, user_agent: ua, ip_hash: ipHash,
    })
    if (!send.first_click_at) {
      await admin.from('client_campaign_sends').update({ first_click_at: new Date().toISOString() }).eq('id', send.id)
      await admin.rpc('increment_campaign_stat', { _campaign_id: send.campaign_id, _field: 'total_clicked' }).catch(() => null)
    }
    return Response.redirect(target, 302)
  }

  if (kind === 'u') {
    // One-click unsubscribe
    await admin.from('client_campaign_events').insert({
      send_id: send.id, campaign_id: send.campaign_id, user_id: send.user_id,
      event_type: 'unsubscribe', user_agent: ua, ip_hash: ipHash,
    })
    await admin.from('client_email_suppressions').insert({
      user_id: send.user_id, email: send.recipient_email, reason: 'unsubscribe',
    }).select()
    if (send.contact_id) {
      await admin.from('client_contacts').update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }).eq('id', send.contact_id)
    }
    await admin.from('client_campaign_sends').update({ unsubscribed_at: new Date().toISOString() }).eq('id', send.id)
    const html = `<!doctype html><html><body style="font-family:system-ui;background:#000;color:#fff;padding:40px;text-align:center"><h1>Unsubscribed</h1><p>${send.recipient_email} has been removed from this list.</p></body></html>`
    return new Response(html, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } })
  }

  return new Response('Not found', { status: 404, headers: corsHeaders })
})
