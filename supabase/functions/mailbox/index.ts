const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1'
const PORTAL_ACCESS_CODE = '42069'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const header = (headers: Array<{ name?: string; value?: string }> | undefined, name: string) =>
  headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

const decodeBody = (data?: string) => {
  if (!data) return ''
  try {
    const base64 = data.replaceAll('-', '+').replaceAll('_', '/')
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    return decodeURIComponent(Array.from(binary).map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''))
  } catch {
    return ''
  }
}

const plainTextFromPayload = (payload: any): string => {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain') return decodeBody(payload.body?.data)
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const text = plainTextFromPayload(part)
      if (text) return text
    }
  }
  return ''
}

const extractEmail = (value: string) => value.match(/<([^>]+)>/)?.[1] ?? value

const encodeRawEmail = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

const gatewayFetch = async (path: string, init: RequestInit = {}) => {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const gmailKey = Deno.env.get('GOOGLE_MAIL_API_KEY')
  if (!lovableKey) throw new Error('Mailbox gateway is not configured')
  if (!gmailKey) throw new Error('Mailbox connection is not configured')

  const response = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': gmailKey,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(`Mailbox request failed [${response.status}]: ${text}`)
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = req.method === 'POST' ? await req.json() : {}
    if (body.accessCode !== PORTAL_ACCESS_CODE) return json({ error: 'Invalid portal access code' }, 401)

    if (body.action === 'list') {
      const query = encodeURIComponent(body.query?.trim() || 'in:inbox newer_than:90d')
      const list = await gatewayFetch(`/users/me/messages?maxResults=20&q=${query}`)
      const messages = await Promise.all((list.messages ?? []).slice(0, 20).map(async (item: { id: string }) => {
        const msg = await gatewayFetch(`/users/me/messages/${item.id}?format=full`)
        const headers = msg.payload?.headers ?? []
        const from = header(headers, 'From')
        const subject = header(headers, 'Subject') || '(no subject)'
        const date = header(headers, 'Date')
        return {
          id: msg.id,
          threadId: msg.threadId,
          from,
          fromEmail: extractEmail(from).toLowerCase(),
          subject,
          snippet: msg.snippet ?? '',
          body: plainTextFromPayload(msg.payload).slice(0, 8000),
          date,
          unread: Array.isArray(msg.labelIds) ? msg.labelIds.includes('UNREAD') : false,
          messageId: header(headers, 'Message-ID'),
        }
      }))
      return json({ messages })
    }

    if (body.action === 'send') {
      const to = String(body.to ?? '').trim()
      const content = String(body.content ?? '').trim()
      if (!to || !content) return json({ error: 'Recipient and message are required' }, 400)
      const subject = String(body.subject ?? '').trim().replace(/^Re:\s*/i, '')
      const raw = encodeRawEmail([
        `To: ${to}`,
        `Subject: Re: ${subject || 'Pixcellor project'}`,
        body.inReplyTo ? `In-Reply-To: ${body.inReplyTo}` : '',
        body.inReplyTo ? `References: ${body.inReplyTo}` : '',
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        content,
        '',
        '— Pixcellor',
      ].filter(Boolean).join('\r\n'))
      const sent = await gatewayFetch('/users/me/messages/send', {
        method: 'POST',
        body: JSON.stringify({ raw, threadId: body.threadId }),
      })
      return json({ sent })
    }

    if (body.action === 'markRead') {
      await gatewayFetch(`/users/me/messages/${body.messageId}/modify`, {
        method: 'POST',
        body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
      })
      return json({ success: true })
    }

    if (body.action === 'archive') {
      await gatewayFetch(`/users/me/messages/${body.messageId}/modify`, {
        method: 'POST',
        body: JSON.stringify({ removeLabelIds: ['INBOX', 'UNREAD'] }),
      })
      return json({ success: true })
    }

    return json({ error: 'Unknown mailbox action' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mailbox action failed'
    return json({ error: message }, 500)
  }
})
