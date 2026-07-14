// Wallet unlock: verifies a fresh 6-digit OTP against wallet_tx_otps and, on
// success, returns the encrypted seed payload for the caller's wallet.
// The client decrypts locally with the wallet password. The ciphertext itself
// never traverses PostgREST — it's only fetched via this JWT-authenticated,
// OTP-gated function so a stolen DB backup can't be brute-forced offline.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PURPOSES = new Set(['send', 'cash_out', 'reveal'])
const MAX_ATTEMPTS = 5

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
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

  let body: { purpose?: string; code?: string } = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const purpose = (body.purpose ?? '').toString()
  const code = (body.code ?? '').toString().trim()
  if (!PURPOSES.has(purpose)) return json({ error: 'Invalid purpose' }, 400)
  if (!/^\d{6}$/.test(code)) return json({ error: 'Invalid code format' }, 400)

  const admin = createClient(supabaseUrl, serviceKey)

  // Latest unconsumed, unexpired OTP for this purpose (mirrors wallet-otp).
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

  // Fetch ciphertext with service role (bypasses RLS; no schema/GRANT change).
  const { data: wallet, error: walletErr } = await admin
    .from('user_wallets')
    .select('encrypted_seed, salt, iv, kdf_iterations')
    .eq('user_id', userId)
    .maybeSingle()

  if (walletErr) return json({ error: 'Failed to load wallet' }, 500)
  if (!wallet) return json({ error: 'No wallet found' }, 404)

  return json({
    ciphertext: wallet.encrypted_seed,
    salt: wallet.salt,
    iv: wallet.iv,
    iterations: wallet.kdf_iterations,
  })
})
