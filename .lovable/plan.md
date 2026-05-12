## Goal
Reduce Lovable Cloud usage (Compute + Database server + Network) without changing any visible behaviour. All user flows — landing page tracking, chat, login magic links, checkout, portal — keep working exactly as before.

## Root causes (confirmed)
- `visitor_falloffs`: 6,882 row updates for 390 rows ⇒ same row re-upserted on every scroll/event.
- `enrich-visitor` edge function: ~1.5s per call, hits IPinfo + writes ~50 columns on every event (page visit, scroll, pricing open, checkout start, chat checkout). Most calls re-fetch IP data we already have.
- `use-login-handoff`: polls `claim_login_handoff` every 2s for up to 5min per login attempt.
- ChatBot Realtime: already gated on `conversationId` existing — fine, leave it.

## Changes

### 1. Frontend: stop chatty scroll/event tracking
File: `src/lib/checkoutTracking.ts`
- `recordScrollDepth`: only call `recordFalloff` when crossing **milestone thresholds (25/50/75/100%)**, not on every increment. Removes ~80% of scroll events.
- `recordFalloff`: add a per-session **dedupe + min-interval** guard — same `event` name ignored within 30s, and global min interval of 2s between any invokes. Stored in `sessionStorage`.
- `recordVisitFalloffOnce` keeps current once-per-session behaviour (already correct).

No removed events — just deduped.

### 2. Edge function: skip IPinfo on repeat calls
File: `supabase/functions/enrich-visitor/index.ts`
- Read existing row first (already done).
- If `enrichment_status = 'enriched'` AND `enriched_at` exists, **skip the IPinfo fetch and the big column write**. Instead do a tiny `update visitor_falloffs set last_seen_at, max_scroll_percent, metadata, portfolio_*, pricing_opened_at, buy_clicked_at` — only the ~10 fields that actually change between events.
- New visitors / first event: full enrichment as today.

This removes the IPinfo network call (Network cost) and replaces a 50-column upsert with a small UPDATE on every repeat event — by far the biggest spend cut.

### 3. Slow down login handoff polling
File: `src/hooks/use-login-handoff.ts`
- Change `intervalMs` from `2000` → `5000` (or `4000` to be safe).
- 2.5× fewer Cloud RPC calls per login attempt with no UX change (typical magic-link click takes 10–30s anyway).

## Out of scope (not changing)
- ChatBot Realtime: only opens after a conversation exists ⇒ already minimal.
- `portal_fetch_snapshot`, indexes, portal queries: no behaviour change requested; will be a follow-up if Cloud usage tab still shows DB server cost dominating after the above.
- Schema, RLS, auth flows, payment flows: untouched.

## Expected impact
- ~70–90% drop in `enrich-visitor` Compute time and IPinfo network calls.
- ~80% drop in `visitor_falloffs` row writes.
- ~60% drop in `claim_login_handoff` calls during login.
- Zero user-visible change.
