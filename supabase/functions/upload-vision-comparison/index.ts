import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BUCKET = 'vision-previews'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

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

    const form = await req.formData()
    const slug = String(form.get('slug') || '').trim()
    const file = form.get('file') as File | null

    if (!slug || !/^[a-zA-Z0-9_-]{3,128}$/.test(slug)) return json({ error: 'Invalid slug' }, 400)
    if (!file) return json({ error: 'Missing file' }, 400)
    if (!ALLOWED.has(file.type)) return json({ error: 'Unsupported file type' }, 400)
    if (file.size > MAX_BYTES) return json({ error: 'File too large (max 10MB)' }, 400)

    const { data: row, error: findErr } = await admin
      .from('vision_previews')
      .select('id, comparison_image_path')
      .eq('slug', slug)
      .maybeSingle()
    if (findErr) return json({ error: findErr.message }, 500)
    if (!row) return json({ error: 'Preview not found' }, 404)
    if (row.comparison_image_path) {
      return json({ error: 'Comparison image already set', path: row.comparison_image_path }, 409)
    }

    const ext = file.type === 'image/png' ? 'png'
      : file.type === 'image/webp' ? 'webp'
      : file.type === 'image/gif' ? 'gif'
      : 'jpg'
    const path = `comparisons/${slug}-${Date.now()}.${ext}`
    const buf = new Uint8Array(await file.arrayBuffer())

    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type,
      cacheControl: '31536000, immutable',
      upsert: false,
    })
    if (upErr) return json({ error: upErr.message }, 500)

    const { error: updErr } = await admin
      .from('vision_previews')
      .update({ comparison_image_path: path })
      .eq('id', row.id)
      .is('comparison_image_path', null)
    if (updErr) {
      await admin.storage.from(BUCKET).remove([path])
      return json({ error: updErr.message }, 500)
    }

    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    return json({ ok: true, path, publicUrl })
  } catch (e) {
    console.error('upload-vision-comparison error', e)
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})
