## Why the logo shows as broken

The image at `https://pixcellor.com/pixcellor-email-logo.png` itself is fine (200 OK, ~7.6 KB PNG). But Lovable's preview is fronted by Cloudflare which sets a `__cf_bm` bot-challenge cookie. Email image proxies (Gmail's `googleusercontent.com`, Yahoo, etc.) sometimes get served an HTML challenge page instead of the PNG. Once that happens, the proxy **caches the broken response for days** for that exact URL — so the logo permanently appears broken for those recipients, even though the URL works in a browser.

There are three robust ways to fix this. I recommend doing **all three** because each covers a different failure mode.

## Plan

### 1. Serve the logo from Supabase Storage (CDN, no bot-challenge)

Upload `pixcellor-email-logo.png` to a **public** Supabase Storage bucket (`email-assets`). Supabase's public CDN URLs are not behind Cloudflare bot protection and have no cookies — Gmail/Outlook image proxies fetch them reliably.

- New URL pattern: `https://rkgjkvghejcmostuqkgw.supabase.co/storage/v1/object/public/email-assets/pixcellor-email-logo.png`
- Append a cache-buster query (`?v=2`) so any email proxy that already cached the broken version fetches fresh.

### 2. Update every email template to use the new URL + safer img markup

Replace the `LOGO_URL` constant in:
- `src/components/email/emailTemplate.ts` (broadcast preview + shell)
- `supabase/functions/send-broadcast/index.ts` (duplicate constant)
- All 6 transactional templates under `supabase/functions/_shared/transactional-email-templates/` (sales-welcome-info, project-requirements-reminder, order-complete, retainer-order-confirmation, elite-order-confirmation, full-works-order-confirmation)

Also harden the `<img>` tag in the broadcast shell so it degrades gracefully when a recipient has images blocked (Outlook desktop default, corporate clients):

```html
<img src="..." alt="Pixcellor"
     width="150" height="40"
     style="display:block;border:0;outline:none;
            color:#ffffff;font-family:-apple-system,...;
            font-size:18px;font-weight:700;
            letter-spacing:-0.02em;line-height:40px;text-align:center;">
```
The inline `color`, `font-*` and explicit `width`/`height` mean that when images are blocked, the alt text "Pixcellor" still renders as styled white text on the black background — looks intentional, not broken.

### 3. Add a wordmark text fallback under the image

In the broadcast shell header, add a hidden-when-images-load text wordmark so even hostile clients (Outlook 2016, secure gateways stripping images entirely) show "Pixcellor" branding.

## Files to change

- `src/components/email/emailTemplate.ts` — update `LOGO_URL`, harden `<img>` styling
- `supabase/functions/send-broadcast/index.ts` — same updates (mirror of above)
- `supabase/functions/_shared/transactional-email-templates/*.tsx` (6 files) — update `LOGO_URL` constant and add the same `style` props to `<Img>`

## Setup step (one-off, done by me via migration + storage)

1. Create public bucket `email-assets` (idempotent).
2. Upload the existing `public/pixcellor-email-logo.png` to it.
3. Confirm the new public URL returns the PNG with no cookies / no challenge.
4. Redeploy all touched edge functions (`send-broadcast`, `send-transactional-email`).

## What this won't fix

- Recipients who have **"Don't display external images"** turned on in Outlook/Apple Mail — no sender can override this. The new alt-text styling at least makes it look like an intentional logo wordmark instead of a broken icon.

Approve and I'll implement.