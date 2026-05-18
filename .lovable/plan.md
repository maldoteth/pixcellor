## Goal

Replace each service "i" info drawer with a full-screen sales page. Same content lives at a permalink route `/services/:slug`. ~20 services across Marketing, Tech, and Business.

## Architecture

**1. Single source of truth — `src/data/services.ts`**
Migrate `SERVICE_BACKS` into a typed registry. Each service:
- `slug`, `name`, `category` (`marketing` | `tech` | `business`), `icon`
- `tagline`, `heroBlurb` (short value prop)
- `info` (kept — the existing one-liner)
- `features[]` (5–8 bullets), `process[]` (3–5 steps), `deliverables[]` (3–6 outputs)
- `pricing?` (free-form string, e.g. "£22/hr" — only on services with public pricing)
- `clients?` (logos/names array — only on services with named past clients)
- `primaryCta` ({ label, action: 'request' | 'sales' | 'pricing' })

**2. Shared full-screen view — `src/components/services/ServiceSalesView.tsx`**
Used by both the drawer and the route page. Sections in order:
- Hero: category chip, name, tagline, blurb, primary CTA + secondary "Request free sample"
- "What you get" features grid
- "How it works" numbered process
- "Deliverables" list
- Optional pricing band (only if `pricing` set)
- Optional "Trusted by" client strip (only if `clients` set)
- Footer CTA band
- Black theme, glass surfaces, gold accent on CTAs, Framer Motion entrance

**3. Drawer → full-screen on every device**
In `PackagesDialog.tsx` `ServiceItemRow`, swap the bottom `<Drawer>` for a full-viewport overlay. Keep the `Drawer` component but style content `inset-0 h-[100dvh] w-screen rounded-none max-w-none`, or switch to Radix `Dialog` with fullscreen className. Renders `<ServiceSalesView slug={…} />` plus a top-right close. Header includes "Open page ↗" linking to `/services/:slug` (new tab).

**4. Routes**
- Add `/services/:slug` → new `src/pages/ServicePage.tsx`
- Add `/services` index → `src/pages/ServicesIndex.tsx` (lists all 20 grouped by category — boosts SEO/internal linking)
- Both lazy-loaded in `src/App.tsx`
- 404 for unknown slugs

**5. SEO**
- Add `react-helmet-async` + wrap app in `<HelmetProvider>` in `src/main.tsx`
- Remove `<link rel="canonical">` from `index.html` (Helmet will own canonical per route; index `/` page gets its own Helmet too)
- Per service page: `<title>`, description, canonical, og:*, and `Service` JSON-LD with `provider: Organization (Pixcellor)`
- Append all 20 service URLs + `/services` to `public/sitemap.xml`

## Seed content highlights (using your info)

- **Telesales campaigns** — `pricing: "£22/hr — every call recorded, full CRM access"`. `clients: ["3M", "Barclays Bank", "Guide Dogs", …]`. CTA: Book a sales call.
- **Recruitment & ATS** — `pricing: "15% on temps · 5% on perms (flat)"`. `clients: ["TikTok", "LinkedIn", "Berkeley Homes", "Bupa", "Galliford Try", "Morgan Sindall", "NHS"]`. CTA: Book a sales call.
- All other services: features/process/deliverables drafted from existing `info` blurbs + Pixcellor positioning (lifetime warranty, 10-day turnaround, AI-agent CRMs, 9-figure caps, multi-7-figure Q1 revenue). No pricing or clients shown unless you give them.

## Default CTA mapping

- Marketing → "Book a sales call" (`pixcellor:open-letstalk` mode `sales`)
- Tech → "Request free sample" + secondary "See pricing" (opens Packages)
- Business → "Book a sales call"

## Files

**New**
- `src/data/services.ts`
- `src/components/services/ServiceSalesView.tsx`
- `src/pages/ServicePage.tsx`
- `src/pages/ServicesIndex.tsx`

**Edited**
- `src/components/PackagesDialog.tsx` — drawer becomes fullscreen, pulls from `services.ts`, adds permalink link
- `src/App.tsx` — add `/services` and `/services/:slug`
- `src/main.tsx` — add `<HelmetProvider>`
- `index.html` — remove sitewide canonical
- `public/sitemap.xml` — add new URLs

## Out of scope (per your earlier answers)

- No changes to other drawers (Packages, Let's Talk, BuyDetails, etc.)
- No case studies, FAQ, or full pricing sections beyond the optional pricing band
- No backend changes
