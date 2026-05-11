# Cross-device magic link auto-login

When someone requests a magic link on desktop and clicks it on mobile, the original desktop tab should silently log itself in within a few seconds — no copy/paste, no QR code.

## How it works (high level)

1. Before sending the email, the desktop tab generates a random `nonce` (handoff id) and stores it locally.
2. The nonce is included in the magic link's redirect URL.
3. When the mobile device clicks the link and finishes Supabase's email-OTP exchange, a tiny landing page mints a **second** one-time magic-link token (server-side, via service role) and saves it to a `login_handoffs` row keyed by the nonce.
4. The desktop tab is subscribed to that row via Supabase Realtime. As soon as the token arrives, desktop calls `verifyOtp` with it and is signed in. The handoff row is then marked consumed.
5. Mobile stays signed in too. Both devices end up logged in.

The desktop never needs to receive the user's actual access/refresh tokens — it redeems its own fresh one-time token, which is the only secure way to do this.

## What gets built

### 1. `login_handoffs` table (new)
Columns: `id` (nonce, text, pk), `email` (text), `token_hash` (text, the second magic link token, nullable until mobile fills it), `claimed_at` (timestamptz, when desktop redeems), `created_at`, `expires_at` (5 min TTL).
RLS: no public access. All access via security-definer RPCs and service-role edge function.

### 2. `request-cross-device-login` edge function (new)
Called by desktop when the user clicks "Send magic link". Inserts a `login_handoffs` row for the nonce + email and triggers `supabase.auth.signInWithOtp` with `emailRedirectTo` set to `/auth/handoff?sid=<nonce>`. Validates email format and rate-limits per email/IP.

### 3. `/auth/handoff` page (new)
Mobile lands here after clicking the email link. Supabase's auth listener fires, the user is signed in on mobile. The page then calls the next edge function with the `sid` from the URL.

### 4. `complete-cross-device-login` edge function (new)
Receives `{ sid, jwt }` from the handoff page. Verifies the JWT, looks up the handoff row, confirms the email matches, then uses the service role to call `auth.admin.generateLink({ type: 'magiclink', email })` and stores the resulting one-time token hash in the row. Mobile UI shows "Signed in — your other device is logging in now."

### 5. Desktop subscription + auto-redeem
`MagicLinkSignup` and `CustomerAuth` are updated:
- Generate a nonce, persist it in component state + localStorage.
- After "Send magic link" succeeds, subscribe via Supabase Realtime to the matching `login_handoffs` row.
- When `token_hash` appears, call `supabase.auth.verifyOtp({ email, token, type: 'magiclink' })` and navigate to `/customer-portal`.
- Show a subtle "Waiting for you to click the link…" status, replaced by "Signed in — taking you to your dashboard…" on success.

### 6. Cleanup + safety
- Handoff rows expire after 5 minutes; a small cron job (or on-insert trigger) deletes expired rows.
- Once `claimed_at` is set, the token hash is wiped and the row becomes unusable.
- Nonces are 256-bit, random, and only meaningful when paired with the matching email — so a leaked nonce alone cannot log anyone in.

## Affected files

- `supabase/migrations/<new>.sql` — `login_handoffs` table + RLS + RPCs
- `supabase/functions/request-cross-device-login/index.ts` — new
- `supabase/functions/complete-cross-device-login/index.ts` — new
- `src/components/MagicLinkSignup.tsx` — add nonce + realtime auto-redeem
- `src/pages/CustomerAuth.tsx` — same upgrade
- `src/components/CustomerAccess.tsx` — same upgrade
- `src/pages/AuthHandoff.tsx` — new landing page for the mobile click
- `src/App.tsx` — register `/auth/handoff` route

## Out of scope (not changing)

- The portal admin login flow (`/portal-login`) — admins use a different mechanism.
- The auth email template itself stays as-is; only the redirect URL changes.
- No 6-digit code fallback — you chose auto-login only.

## Edge cases handled

- Desktop tab closed before mobile click → handoff row expires, no harm.
- Mobile click on the same desktop tab → still works; desktop just logs in via the normal flow and the handoff row is ignored.
- User clicks the link twice → second click is a no-op (token already consumed).
- Multiple desktop tabs open → only the one with the matching nonce in localStorage logs in.
