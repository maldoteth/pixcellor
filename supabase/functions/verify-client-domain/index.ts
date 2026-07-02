import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const PLATFORM_SPF_INCLUDE = 'notify.pixcellor.com'

type DohAnswer = { name: string; type: number; TTL: number; data: string }

async function resolve(name: string, type: 'TXT' | 'MX' | 'CNAME' | 'A'): Promise<DohAnswer[]> {
  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { accept: 'application/dns-json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data?.Answer ?? []) as DohAnswer[]
}

const stripQuotes = (s: string) => s.replace(/^"|"$/g, '').replace(/"\s+"/g, '')

async function checkSpf(domain: string) {
  const answers = await resolve(domain, 'TXT')
  const txts = answers.map((a) => stripQuotes(a.data)).filter((t) => t.toLowerCase().startsWith('v=spf1'))
  return txts.some((t) => t.toLowerCase().includes(`include:${PLATFORM_SPF_INCLUDE.toLowerCase()}`))
}

async function checkDkim(domain: string, selector: string, expectedKey: string | null) {
  if (!expectedKey) return false
  const answers = await resolve(`${selector}._domainkey.${domain}`, 'TXT')
  const txt = answers.map((a) => stripQuotes(a.data)).join('')
  const cleanExpected = expectedKey.replace(/\s+/g, '').replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '')
  return txt.replace(/\s+/g, '').includes(cleanExpected.slice(0, 60))
}

async function checkDmarc(domain: string) {
  const answers = await resolve(`_dmarc.${domain}`, 'TXT')
  const txts = answers.map((a) => stripQuotes(a.data))
  return txts.some((t) => t.toLowerCase().startsWith('v=dmarc1'))
}

async function checkMx(domain: string) {
  const answers = await resolve(domain, 'MX')
  return answers.length > 0
}

async function generateDkimKeypair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )
  const pubBuf = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const privBuf = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  return { publicKey: b64(pubBuf), privateKey: b64(privBuf) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    })
    const { data: userData } = await anon.auth.getUser()
    if (!userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const body = await req.json().catch(() => ({}))
    const action = body.action as 'add' | 'verify' | 'delete'

    if (action === 'add') {
      const domain = String(body.domain ?? '').trim().toLowerCase()
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
        return new Response(JSON.stringify({ error: 'Invalid domain' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const { publicKey, privateKey } = await generateDkimKeypair()
      const { data, error } = await admin
        .from('client_email_domains')
        .insert({
          user_id: userData.user.id,
          domain,
          dkim_public_key: publicKey,
          dkim_private_key: privateKey,
          status: 'pending',
        })
        .select('id, domain, dkim_selector, dkim_public_key, verification_token, status, spf_ok, dkim_ok, dmarc_ok, mx_ok')
        .single()
      if (error) throw error
      return new Response(JSON.stringify({ domain: data, spfInclude: PLATFORM_SPF_INCLUDE }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'verify') {
      const domainId = String(body.domain_id ?? '')
      const { data: row, error } = await admin
        .from('client_email_domains')
        .select('*')
        .eq('id', domainId)
        .eq('user_id', userData.user.id)
        .maybeSingle()
      if (error || !row) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const [spf, dkim, dmarc, mx] = await Promise.all([
        checkSpf(row.domain),
        checkDkim(row.domain, row.dkim_selector, row.dkim_public_key),
        checkDmarc(row.domain),
        checkMx(row.domain),
      ])
      const allCore = spf && dkim && dmarc
      const status = allCore ? 'verified' : (spf || dkim || dmarc ? 'partial' : 'pending')
      await admin.from('client_email_domains').update({
        spf_ok: spf, dkim_ok: dkim, dmarc_ok: dmarc, mx_ok: mx,
        status,
        verified_at: allCore ? new Date().toISOString() : row.verified_at,
        last_checked_at: new Date().toISOString(),
      }).eq('id', domainId)

      return new Response(JSON.stringify({ spf, dkim, dmarc, mx, status }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'delete') {
      const domainId = String(body.domain_id ?? '')
      await admin.from('client_email_domains').delete().eq('id', domainId).eq('user_id', userData.user.id)
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
