// Wallet transaction OTP: request + verify.
// Sends a 6-digit code by email and verifies it with rate limiting.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PURPOSES = new Set(['send', 'cash_out', 'reveal'])
const PURPOSE_LABELS: Record<string, string> = {
  send: 'a transfer',
  cash_out: 'a cash out',
  reveal: 'a wallet-key reveal',
}
const OTP_TTL_MIN = 5
const REQUEST_COOLDOWN_MS = 30_000
const MAX_REQUESTS_PER_HOUR = 8
const MAX_ATTEMPTS = 5

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateCode(): string {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return (arr[0] % 1_000_000).toString().padStart(6, '0')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const token = authHeader.replace('Bearer ', '')
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token)
  if (claimsErr || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401)
  const userId = claims.claims.sub as string

  const admin = createClient(supabaseUrl, serviceKey)

  let body: { action?: string; purpose?: string; code?: string } = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const purpose = (body.purpose ?? '').toString()
  if (!PURPOSES.has(purpose)) return json({ error: 'Invalid purpose' }, 400)

  if (body.action === 'request') {
    // Rate limit: count recent rows
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recent } = await admin
      .from('wallet_tx_otps')
      .select('id, created_at')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
    if (recent && recent.length >= MAX_REQUESTS_PER_HOUR) {
      return json({ error: 'Too many codes requested. Try again later.' }, 429)
    }
    if (recent && recent[0]) {
      const last = new Date(recent[0].created_at).getTime()
      if (Date.now() - last < REQUEST_COOLDOWN_MS) {
        return json({ error: 'Please wait before requesting another code.' }, 429)
      }
    }

    // Generate + store
    const code = generateCode()
    const codeHash = await sha256Hex(`${userId}:${code}`)
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString()
    const { error: insErr } = await admin.from('wallet_tx_otps').insert({
      user_id: userId,
      purpose,
      code_hash: codeHash,
      expires_at: expiresAt,
    })
    if (insErr) return json({ error: 'Failed to create code' }, 500)

    // Look up email
    const { data: userInfo, error: userErr } = await admin.auth.admin.getUserById(userId)
    if (userErr || !userInfo?.user?.email) return json({ error: 'No email on file' }, 400)
    const email = userInfo.user.email

    // Send email via existing transactional pipeline
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateName: 'wallet-transaction-otp',
        recipientEmail: email,
        idempotencyKey: `wallet-otp-${userId}-${Date.now()}`,
        templateData: {
          code,
          purposeLabel: PURPOSE_LABELS[purpose],
          expiresMinutes: OTP_TTL_MIN,
        },
      }),
    })
    if (!emailRes.ok) {
      const txt = await emailRes.text().catch(() => '')
      console.error('email send failed', emailRes.status, txt)
      return json({ error: 'Failed to send code email' }, 500)
    }

    return json({ ok: true, expiresInSeconds: OTP_TTL_MIN * 60 })
  }

  if (body.action === 'verify') {
    const code = (body.code ?? '').toString().trim()
    if (!/^\d{6}$/.test(code)) return json({ error: 'Invalid code format' }, 400)

    // Latest unconsumed, unexpired OTP for this purpose
    const { data: rows } = await admin
      .from('wallet_tx_otps')
      .select('*')
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    const row = rows?.[0]
    if (!row) return json({ error: 'No active code. Request a new one.' }, 400)
    if (row.attempts >= MAX_ATTEMPTS) {
      return json({ error: 'Too many wrong attempts. Request a new code.' }, 429)
    }

    const codeHash = await sha256Hex(`${userId}:${code}`)
    if (codeHash !== row.code_hash) {
      await admin
        .from('wallet_tx_otps')
        .update({ attempts: row.attempts + 1 })
        .eq('id', row.id)
      return json({ error: 'Incorrect code' }, 400)
    }

    await admin
      .from('wallet_tx_otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id)

    return json({ ok: true })
  }

  return json({ error: 'Unknown action' }, 400)
})
