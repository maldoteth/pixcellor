# Production-Readiness Audit Plan

I'll run a comprehensive audit across 7 areas and deliver a single report with findings ranked by severity (Critical / High / Medium / Low) plus a prioritized fix list. No code changes during the audit — fixes follow once you approve the report.

## Scope

**1. Security & Backend (Lovable Cloud)**
- Run Supabase linter + full security scan
- Review every table's RLS policies for gaps, recursion, and overly permissive rules (`true`, missing INSERT/UPDATE/DELETE policies)
- Check `user_roles` pattern, `has_role` security-definer usage, privilege-escalation paths
- Audit edge functions: `verify_jwt` correctness, admin checks, secret usage, input validation, CORS
- Confirm no secrets leak to client; verify `.env` only exposes public keys
- Check auth config: leaked-password (HIBP) protection, anonymous sign-ins disabled, OTP expiry, redirect URLs

**2. Frontend Code Quality**
- TypeScript strictness, dead code, oversized components (LetsTalkPrompt, ChatBot, etc.)
- React Query usage, error boundaries, loading/empty states
- Console errors / runtime errors snapshot
- ESLint clean run

**3. Performance**
- Bundle size + lazy-loading of routes (15 pages currently eager?)
- Heavy deps (framer-motion, tiptap, embla, three) — code-split candidates
- Image optimization, lazy loading, responsive sizes
- Animation cost on mobile (already a known constraint)

**4. SEO & AEO**
- `SeoHead` coverage on every public route
- Single H1 per page, meta description length, canonical, OG/Twitter tags
- `sitemap.xml` + `robots.txt` accuracy
- JSON-LD validity (Organization, Product, FAQ where relevant)

**5. Accessibility**
- Keyboard nav, focus rings (recent dialog focus issue noted)
- Color contrast on the all-black theme with white accents
- Alt text, aria-labels on icon-only buttons
- Reduced-motion support for the scroll-morph hero

**6. Reliability & UX**
- Error states for all network calls (Stripe checkout, vision generation, lead capture)
- Idempotency on order/email flows (already partially in place)
- Mobile rotate prompt, drawer scroll behavior
- 404 + auth-error fallbacks

**7. Legal / Compliance**
- Privacy consent persistence (per memory)
- Cookie/storage banner behavior
- Legal page completeness, unsubscribe + email suppression flows

## Deliverable

A single markdown report grouped by area, each finding with:
- Severity, file/location, what's wrong, recommended fix, effort estimate

Followed by a **Top 10 fix queue** so we can tackle the highest-impact items first.

## Technical notes

- Read-only tools used: `supabase--linter`, `security--run_security_scan`, `supabase--read_query`, edge-function log sampling, `code--dependency_scan`, ESLint, build output inspection, `rg` searches.
- No migrations, deploys, or file edits during audit.
- Estimated audit runtime: ~5–10 minutes of tool calls before the report is ready.

Approve and I'll run it.
