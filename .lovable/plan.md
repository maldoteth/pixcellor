# Production Readiness — Status & Recommendation

## TL;DR
**You are 90% prod-ready.** Ship-blockers from the original audit are resolved. The remaining items are *hardening*, not blockers. **Splitting Portal.tsx is NOT required to ship** — defer it.

---

## What's already fixed (from earlier audit)
- `login_handoffs` locked down + RPC claim flow
- `vision_previews` admin-only + slug RPC
- Realtime publication pruned (sensitive tables removed)
- Legacy `portal_*` `'42069'` overloads dropped
- HIBP enabled, anonymous sign-ins disabled
- `App.tsx` lazy-loads non-root routes + ErrorBoundary + React Query defaults
- Edge functions with `verify_jwt = false` audited (Stripe sig, service tokens, slugs)

---

## Remaining items — categorized

### Ship-blockers (do before launch)
None outright, **but strongly recommended**:
1. **Public INSERT tables need rate limiting / abuse protection**
   `contact_inquiries`, `lets_talk_leads`, `client_profiles` all allow `WITH CHECK (true)` to anon. Without throttling you'll get spammed.
   Fix: add a lightweight edge function wrapper (`submit-contact`, `submit-lets-talk`) with IP + visitor-id rate limit + honeypot, then tighten RLS to service-role only. ~2-3 hours.

2. **Storage buckets `submission-attachments` + `chat-images`**
   Decision needed (deferred from last round):
   - **(a) Private + signed URLs** — most secure, breaks any historical public links stored in DB.
   - **(b) Keep public, randomize paths** — zero breakage, weaker.
   Recommend (a) for `submission-attachments` (sensitive client uploads), (b) acceptable for `chat-images`.

### Nice-to-have hardening (post-launch OK)
3. Tighten Auth redirect allow-list to `pixcellor.com` + preview domain only.
4. Run `supabase--linter` for any remaining warnings (function search_path, etc.).
5. Add Sentry or similar for ErrorBoundary catches.

### NOT needed for prod
6. **Portal.tsx split (3,572 lines)** — *skip for now*.
   - It's an admin-only page, not user-facing.
   - It works, it's tested by your daily use, and refactoring 3.5k lines of admin tooling carries more regression risk than reward right now.
   - Revisit only when (a) you need to add a major new feature and editing it becomes painful, or (b) build times suffer. Neither is true today.

---

## Recommendation

**Ship after doing items 1 + 2 only.** Estimated 3-4 hours of work.

Items 3-5 can land in the week after launch. Item 6 (Portal split) — leave it alone until it actually hurts.

Want me to proceed with items 1 and 2 (rate-limited submit endpoints + storage bucket decision)?
