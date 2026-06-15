import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'

const BodySchema = z.object({
  email: z.string().max(254),
  redirectTo: z.string().max(1024).optional(),
}).passthrough()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'Pixcellor™'
const SENDER_DOMAIN = 'notify.pixcellor.com'
const FROM_DOMAIN = 'pixcellor.com'
const SITE_URL = 'https://pixcellor.com'

// Allowlist of origins permitted as magic-link redirect targets. Prevents
// attackers from harvesting auth tokens by pointing the link at an external
// domain.
const ALLOWED_REDIRECT_ORIGINS = new Set([
  'https://pixcellor.com',
  'https://www.pixcellor.com',
  'https://morph-glide-show.lovable.app',
])
const ALLOWED_REDIRECT_SUFFIXES = ['.lovable.app', '.lovable.dev']
function isAllowedRedirect(target: string): boolean {
  try {
    const u = new URL(target)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    if (ALLOWED_REDIRECT_ORIGINS.has(u.origin)) return true
    return ALLOWED_REDIRECT_SUFFIXES.some((s) => u.hostname.endsWith(s))
  } catch {
    return false
  }
}


const RATE_LIMIT_COUNT = 3
const RATE_LIMIT_WINDOW_SECONDS = 120

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.json().catch(() => ({}))
    const parsedBody = BodySchema.safeParse(rawBody)
    if (!parsedBody.success) {
      return json({ error: 'Invalid input' }, 400)
    }
    const body = parsedBody.data
    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const redirectTo = typeof body?.redirectTo === 'string' ? body.redirectTo : `${SITE_URL}/customer-portal`

    if (!rawEmail || !/.+@.+\..+/.test(rawEmail) || rawEmail.length > 254) {
      return json({ error: 'Invalid email' }, 400)
    }
    if (redirectTo.length > 1024 || !isAllowedRedirect(redirectTo)) {
      return json({ error: 'Invalid redirect' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Rate limit: max 3 in 120 seconds per email.
    const sinceIso = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString()
    const { count, error: countErr } = await admin
      .from('login_link_requests')
      .select('id', { head: true, count: 'exact' })
      .eq('email', rawEmail)
      .gte('created_at', sinceIso)

    if (countErr) {
      console.error('rate count failed', countErr)
    } else if ((count ?? 0) >= RATE_LIMIT_COUNT) {
      const { data: oldest } = await admin
        .from('login_link_requests')
        .select('created_at')
        .eq('email', rawEmail)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      const retryAfter = oldest?.created_at
        ? Math.max(
            1,
            Math.ceil(
              (new Date(oldest.created_at).getTime() + RATE_LIMIT_WINDOW_SECONDS * 1000 - Date.now()) / 1000,
            ),
          )
        : RATE_LIMIT_WINDOW_SECONDS
      return json({ error: 'rate_limited', retryAfter }, 429)
    }

    // Generate the magic link server-side. This bypasses GoTrue's per-email
    // resend cooldown — we enforce our own (3 per 2 minutes) above.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: rawEmail,
      options: { redirectTo },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('generateLink failed', linkErr)
      return json({ error: 'Could not create login link' }, 500)
    }

    const confirmationUrl = linkData.properties.action_link

    // Render and enqueue the same magic-link email used by the auth hook.
    const html = await renderAsync(
      React.createElement(MagicLinkEmail, { siteName: SITE_NAME, confirmationUrl }),
    )
    const text = await renderAsync(
      React.createElement(MagicLinkEmail, { siteName: SITE_NAME, confirmationUrl }),
      { plainText: true },
    )

    const messageId = crypto.randomUUID()
    const idempotencyKey = `customer-login-link-${messageId}`
    const normalizedEmail = rawEmail.toLowerCase()
    let unsubscribeToken = generateToken()

    const { data: existingToken, error: tokenLookupError } = await admin
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (tokenLookupError) {
      console.error('unsubscribe token lookup failed', tokenLookupError)
      return json({ error: 'Could not prepare email' }, 500)
    }

    if (existingToken?.token) {
      unsubscribeToken = existingToken.token
    } else {
      const { error: tokenError } = await admin
        .from('email_unsubscribe_tokens')
        .upsert({ token: unsubscribeToken, email: normalizedEmail }, { onConflict: 'email', ignoreDuplicates: true })
      if (tokenError) {
        console.error('unsubscribe token create failed', tokenError)
        return json({ error: 'Could not prepare email' }, 500)
      }
    }

    await admin.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'magiclink',
      recipient_email: rawEmail,
      status: 'pending',
    })

    const { error: enqueueError } = await admin.rpc('enqueue_email', {
      queue_name: 'auth_emails',
      payload: {
        message_id: messageId,
        to: rawEmail,
        from: `${SITE_NAME} <projects@${FROM_DOMAIN}>`,
        reply_to: `help@${FROM_DOMAIN}`,
        sender_domain: SENDER_DOMAIN,
        subject: 'Your login link',
        html,
        text,
        purpose: 'transactional',
        idempotency_key: idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        label: 'magiclink',
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('enqueue failed', enqueueError)
      await admin.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'magiclink',
        recipient_email: rawEmail,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      })
      return json({ error: 'Could not send email' }, 500)
    }

    // Record the request only after a successful enqueue.
    await admin.from('login_link_requests').insert({ email: rawEmail })

    return json({ ok: true })
  } catch (err) {
    console.error(err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
