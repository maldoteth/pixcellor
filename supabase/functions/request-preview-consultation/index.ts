import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BUCKET = 'vision-previews'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    const body = await req.json().catch(() => ({})) as { slug?: string; phone?: string }
    const slug = String(body.slug || '').trim()
    const phoneProvided = Object.prototype.hasOwnProperty.call(body, 'phone')
    const providedPhone = (body.phone ?? '').toString().trim()

    if (!slug || !/^[a-zA-Z0-9_-]{3,128}$/.test(slug)) {
      return json({ error: 'Invalid slug' }, 400)
    }

    const { data: preview, error: findErr } = await admin
      .from('vision_previews')
      .select('id, slug, title, brief, image_path, client_email')
      .eq('slug', slug)
      .maybeSingle()
    if (findErr) return json({ error: findErr.message }, 500)
    if (!preview) return json({ error: 'Preview not found' }, 404)

    const email = (preview.client_email || '').trim().toLowerCase()
    if (!email) {
      return json({ ok: false, reason: 'no_client_email' })
    }

    // Look up the most recent known phone + name for this email
    let knownPhone: string | null = null
    let knownName: string | null = null

    const { data: contact } = await admin
      .from('contacts')
      .select('name, contact_name, phone, updated_at')
      .ilike('email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (contact) {
      knownPhone = (contact.phone || '').trim() || null
      knownName = (contact.contact_name || contact.name || '').trim() || null
    }

    if (!knownPhone) {
      const { data: lead } = await admin
        .from('lets_talk_leads')
        .select('name, phone, created_at')
        .ilike('email', email)
        .not('phone', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lead) {
        knownPhone = (lead.phone || '').trim() || null
        if (!knownName) knownName = (lead.name || '').trim() || null
      }
    }

    const finalPhone = (providedPhone || knownPhone || '').trim()
    if (!finalPhone && !phoneProvided) {
      // No phone on file and caller hasn't been prompted yet — ask for one.
      // Do NOT echo the email back; that would allow slug enumeration to
      // harvest customer email addresses.
      return json({ ok: false, reason: 'phone_required' })
    }

    const imageUrl = admin.storage.from(BUCKET).getPublicUrl(preview.image_path).data.publicUrl
    const requestDetails = {
      consultation: true,
      company: null,
      dream: preview.brief ?? null,
      colours: null,
      vision_image_url: imageUrl,
      preview_slug: preview.slug,
      preview_title: preview.title,
      source_preview_image_url: imageUrl,
      note: 'Visitor requested a consultation directly from a vision preview link (one-click).',
    }

    const insertPayload = {
      name: knownName || '',
      email,
      phone: finalPhone || null,
      source: 'consultation_request',
      request_details: requestDetails,
      attachment_urls: imageUrl ? [imageUrl] : [],
    }

    const { error: insertErr } = await admin.from('lets_talk_leads').insert(insertPayload)
    if (insertErr) return json({ error: insertErr.message }, 500)

    // Fire-and-forget downstream notifications
    admin.functions
      .invoke('process-lets-talk-lead', { body: insertPayload })
      .catch((err) => console.error('process-lets-talk-lead failed:', err))

    return json({ ok: true })
  } catch (e) {
    console.error('request-preview-consultation error', e)
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})
