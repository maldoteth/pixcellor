## Goal
Reduce catalogue from 5 packages to 3: **Growth**, **Scale**, **Enterprise** (all retainers). Delete **Full Works** and **Elite Build** everywhere — pages, dialogs, comparison tables, chatbot knowledge, edge functions, email templates, Stripe references, SEO/OG, MCP tools, and copy.

## Scope of changes

### Data / config
- `src/data/packages.ts` — remove `full-works` and `elite` entries; keep only `retainer-growth`, `retainer-scale`, `retainer-enterprise`. Drop `ogFullWorks` / `ogElite` imports.
- `src/data/services.ts`, `src/data/serviceSeo.ts`, `src/data/ogImages.ts` — strip Full Works / Elite mentions & mappings.
- Rename primary package label wording so retainers read as the "standard" (e.g., FAQ copy that says "upgrade to Elite" → point to Scale/Enterprise instead).

### Pages
- `src/pages/Packages.tsx`, `PackageDetail.tsx`, `GetStarted.tsx`, `ReferralLanding.tsx`, `ByowLanding.tsx`, `Portal.tsx`, `CustomerPortal.tsx`, `Legal.tsx`, `Portfolio.tsx` — remove Full Works / Elite cards, links, comparison rows, tier-gated logic.

### Components
- `PackageCompareTable.tsx` — drop the two columns.
- `PackagesDialog.tsx`, `LetsTalkPrompt.tsx`, `BuyDetailsPrompt.tsx`, `NewOrderDialog.tsx`, `CustomerAccess.tsx`, `SmsBroadcasts.tsx`, `services/ServiceSalesView.tsx` — remove options / branches referring to the two packages.
- `ChatBot.tsx` — remove Alex's knowledge of Full Works / Elite so it only recommends the 3 retainers.

### Backend / edge functions
- `supabase/functions/create-checkout/index.ts` — remove Full Works / Elite price IDs and any tier branching.
- `supabase/functions/stripe-webhook/index.ts` — drop handling for those price IDs / order confirmation emails.
- `supabase/functions/send-order-confirmation`, `send-order-complete`, `send-requirements-reminder`, `send-broadcast`, `submit-edit-request`, `sales-chat`, `create-invoice`, `generate-vision` — remove references / branches.
- `supabase/functions/mcp/index.ts`, `src/lib/mcp/index.ts`, `src/lib/mcp/tools/list-packages.ts` — expose only 3 packages.

### Email templates (delete)
- `supabase/functions/_shared/transactional-email-templates/full-works-order-confirmation.tsx`
- `supabase/functions/_shared/transactional-email-templates/elite-order-confirmation.tsx`
- Update `internal-new-order-notification.tsx` to remove the two tiers.

### Assets (delete)
- `src/assets/og/07-full-works.png.asset.json`
- `src/assets/og/08-elite.png.asset.json`
- Remove `og-full-works.jpg` / `og-elite.jpg` imports (leave asset files untouched if referenced by history; simplest: remove imports/usages).

### SEO
- `index.html`, `public/sitemap.xml`, `public/llms.txt` — drop `/packages/full-works` and `/packages/elite` URLs and any mentions.

### Stripe (no destructive API calls)
- Leave the two Stripe products/prices archived in Stripe (safer than deletion, protects historical orders). Only remove them from the app codepaths so nothing new can be purchased.

## Not touched
- Historical SQL migrations under `supabase/migrations/` (immutable history).
- Existing customer orders / DB rows for those tiers.
- Stripe products/prices themselves (kept archived server-side).

## Confirm before I run
1. Keep the 3 retainer names/prices exactly as they are today (Growth £89/mo, Scale £479/mo, Enterprise), correct?
2. OK to leave Stripe products for Full Works & Elite in place (archived, not deleted) so past orders/invoices still resolve?
