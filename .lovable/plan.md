## Why noreply@ is going to spam

Yes — this is a real and well-documented deliverability issue:
1. **`noreply` is a known spam-filter heuristic.** Gmail, Outlook, and SpamAssassin all weight `noreply`/`no-reply` mailboxes as lower-trust transactional patterns.
2. **Engagement matters.** `projects@` gets opened and replied to → its reputation builds. `noreply@` gets ignored → its reputation stays poor, even on the same verified domain.
3. **Missing `Reply-To`** on the noreply functions makes it worse — filters look for a valid reply path.

DNS / SPF / DKIM / DMARC are identical for both addresses (both go through `notify.pixcellor.com`), so the domain itself is fine. The fix is the From address + headers.

## Current state in the codebase

| Function | From | Reply-To |
|---|---|---|
| `send-transactional-email` | `projects@pixcellor.com` | `help@pixcellor.com` |
| `send-broadcast` | `projects@pixcellor.com` | `help@pixcellor.com` |
| `auth-email-hook` (password reset, magic link, verification) | `noreply@pixcellor.com` | none |
| `request-customer-login-link` (custom magic link) | `noreply@pixcellor.com` | none |

## Changes

1. **`supabase/functions/auth-email-hook/index.ts`**
   - Change `from` from `noreply@pixcellor.com` → `projects@pixcellor.com`
   - Add `reply_to: help@pixcellor.com`

2. **`supabase/functions/request-customer-login-link/index.ts`**
   - Change `from` from `noreply@pixcellor.com` → `projects@pixcellor.com`
   - Add `reply_to: help@pixcellor.com`

3. **Redeploy** both edge functions so the new headers take effect.

## What to expect after deploy

- New auth + magic-link emails will send from `projects@pixcellor.com` with a real reply path.
- Spam placement should improve immediately for new recipients; existing recipients whose inbox already learned "noreply@pixcellor.com = spam" may need a few engaged emails before Gmail/Outlook reclassify, but since you're changing the local-part the reputation effectively resets.
- No DNS changes needed.

## Optional follow-ups (not in this plan unless you want them)

- Add a small text line in auth emails like "Replies to this email reach our support team" to encourage engagement.
- Set up DMARC reporting (`rua=`) to monitor placement over time.
- Warm-up: ask a couple of test recipients to mark a magic-link email "Not spam" / move to inbox once.
