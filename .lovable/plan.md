## Goal

Polish the existing Pixcellor-branded auth email templates (signup, magic link, password reset, plus invite, email-change, reauthentication) and add a full compliance footer to improve deliverability and inbox trust. Then redeploy `auth-email-hook` so the changes go live.

## What stays

- Dark `#0a0a0a` container on white outer background (good for both light/dark inboxes and deliverability).
- Pixcellor™ logo + wordmark header.
- White CTA button on dark surface.
- Arial/Helvetica web-safe stack (renders consistently across mail clients).
- Per-template Preview text and Heading.

## What changes

### 1. Visual polish (all 6 templates)

- Tighten header: align logo (40px) baseline with wordmark, reduce wordmark to 13px / letter-spacing 0.3px for a cleaner mark.
- Slightly larger body text (16px / line-height 26px) — better readability and less spammy than tight 15px copy.
- Soften body color from `#d0d0d0` to `#cfcfcf` and heading from `#f7f7f7` to `#fafafa`.
- Reduce H1 from 28px to 26px so the email feels less shouty (helps spam scoring).
- Add 8px rounded corners on the CTA button (`borderRadius: 8px`) — subtle modern feel without breaking Outlook (graceful fallback).
- Add a thin 1px `#1f1f1f` divider above the footer (already there) and keep footer text at 12px `#8a8a8a`.
- Consistent 32px inner padding on all sides (was 30/28).

### 2. Full compliance footer (all 6 templates)

A shared footer block with:

- Brand line: `Pixcellor™` + tagline `Premium product photo editing`.
- Business identifier: `Pixcellor · United Kingdom` (placeholder — confirm exact business address line in implementation; default to country-only if no registered address yet).
- Reason-for-receiving sentence specific to template, e.g.:
  - signup: "You're receiving this because someone created a Pixcellor account with this email."
  - recovery: "You're receiving this because a password reset was requested for this email."
  - magic-link: "You're receiving this because a login link was requested for this email."
  - invite: "You're receiving this because you were invited to Pixcellor."
  - email-change: "You're receiving this because an email change was requested on your Pixcellor account."
  - reauthentication: "You're receiving this because a verification code was requested on your Pixcellor account."
- Links row (plain text links, white underline): `Privacy` → `https://pixcellor.com/legal` · `Contact` → `mailto:hello@pixcellor.com` · `pixcellor.com` → `https://pixcellor.com`.
- Copyright line: `© 2026 Pixcellor. All rights reserved.`

Implemented as a shared `AuthEmailFooter` component in a new file `supabase/functions/_shared/email-templates/_footer.tsx` to keep the six templates DRY. Each template imports it and passes the per-template `reason` string.

### 3. Copy refinements

- signup: change CTA from `Confirm Email` to `Confirm my email` (more human).
- recovery: keep `Reset Password` → change to `Reset my password`.
- magic-link: keep `Log In` → change to `Open Pixcellor`.
- invite: keep `Accept Invitation`.
- Tighten supporting sentences to one short line where possible.

### 4. Deploy

After edits, redeploy `auth-email-hook` so the templates render in production. Templates are bundled into the hook at deploy time — without this step nothing changes for users.

## Files to change

- `supabase/functions/_shared/email-templates/_footer.tsx` (new) — shared footer component + styles.
- `supabase/functions/_shared/email-templates/signup.tsx` — apply polish, swap footer block, copy tweak.
- `supabase/functions/_shared/email-templates/recovery.tsx` — same.
- `supabase/functions/_shared/email-templates/magic-link.tsx` — same.
- `supabase/functions/_shared/email-templates/invite.tsx` — same.
- `supabase/functions/_shared/email-templates/email-change.tsx` — same.
- `supabase/functions/_shared/email-templates/reauthentication.tsx` — same.

No changes to `auth-email-hook/index.ts`, `config.toml`, or the registry.

## Out of scope

- Changing the sender domain or DNS (already done — `notify.pixcellor.com`).
- Rewriting transactional templates (orders, sales, broadcasts).
- Adding plain-text variants (React Email auto-generates a text part from the HTML; sufficient for now).
- Migrating to a light theme — staying on-brand dark.

## Verification

- Read each template after edit to confirm structure.
- Use the email preview action so you can visually QA signup, recovery, and magic-link before considering it done.
- Confirm `auth-email-hook` deploy succeeds in logs.
