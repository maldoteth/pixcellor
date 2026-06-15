## Goal
Turn `/byow` from a private client portal into a **high-conversion landing page** that sells the "Build Your Own Website" service, and move every existing BYOW feature into the portals we already have. No new portals, no new logins.

## What changes

### 1. `/byow` — new marketing lander (replaces ByowDashboard at this route)
Single dark page in the Pixcellor style (system-ui, glass cards, white accents, framer-motion entrances):

- **Hero**: headline ("Build your own site. We ship every change in hours."), subline, two CTAs (`Start a site` → scroll to pricing; `See how it works` → scroll to steps). Animated chat-mock visual on the right.
- **Logo strip / proof** (re-uses existing portfolio thumbs we already have).
- **How it works** (3 steps): 1) Pick a plan → 2) Chat prompts to evolve your site → 3) We ship daily inside your usage quota.
- **What you get**: 4-tile bento (managed hosting, SEO/AEO, AI lead-gen bot, 24h human delivery).
- **Pricing**: 3 tier cards (Care £100, Studio £500, Agency £2,500) + monthly/yearly toggle, then a small **Top-up packs** strip (£2 / £169 / £1,250). Each card "Start" button calls `byow-create-checkout` (lander mode, see backend note).
- **FAQ** (accordion, 6 Qs).
- **Final CTA + footer** linking to legal pages.
- SEO: `<SeoHead>` with title/description, JSON-LD `Service` + `FAQPage`.

The lander itself never asks for login. Stripe Checkout collects email; once paid, the webhook provisions the byow_site and emails a magic link into the Customer Portal.

### 2. CustomerPortal — new "Sites" tab
Adds one tab to the existing `CustomerPortal`:
- Lists `byow_sites` owned by the logged-in user with quota meter and plan badge.
- Clicking a site opens an in-tab builder pane (chat column + dual-iframe Live/Preview, refresh, mode toggle) — same UX as ByowBuilder.tsx but embedded.
- "Buy prompts / Change plan" opens the existing `ByowPlansDialog`.
- "Manage billing" uses the existing `create-billing-portal` function (already wired in CustomerPortal? if not, reuse the same call). No separate Billing button needed beyond what CustomerPortal already exposes.

### 3. Portal (Studio tab) — new "Client sites" sub-section
Inside the existing `Studio` tab content, render a `<ByowAdminPanel>` (extracted from current ByowAdmin.tsx) with its own internal sub-tabs:
- **Queue** — pending prompts to action
- **Sites** — all provisioned sites + edit project IDs / URLs / tier
- **New site** — create a site for a customer email + tier

Replaces the standalone `/byow-admin` route.

### 4. Routes & files
- Routes removed from `src/App.tsx`: `/byow/login`, `/byow/site/:siteId`, `/byow-admin`.
- Route kept: `/byow` → now `ByowLanding`.
- Files deleted: `src/pages/ByowLogin.tsx`, `src/pages/ByowDashboard.tsx`, `src/pages/ByowAdmin.tsx`, `src/pages/ByowBuilder.tsx`.
- New files: `src/pages/ByowLanding.tsx`, `src/components/byow/ByowBuilderPane.tsx` (extracted builder), `src/components/byow/ByowSitesTab.tsx` (CustomerPortal tab), `src/components/byow/ByowAdminPanel.tsx` (Studio sub-section).
- Kept untouched: `src/components/byow/ByowPlansDialog.tsx`, all `supabase/functions/byow-*` and `_shared/byow-pricing.ts`, migrations.

### 5. Backend (minimal)
- `byow-create-checkout`: accept an optional `site_id`. If absent (lander flow), create the Stripe session without `site_id` metadata and instead set `kind: "byow_signup"` + `tier`. Stripe Checkout collects the customer email itself.
- `stripe-webhook` (`checkout.session.completed`, branch `kind === "byow_signup"`): create a `byow_sites` row owned by a freshly created/looked-up auth user (by email) with `status = 'pending_setup'`, attach the new subscription, and send a magic-link email so the buyer lands inside `/customer-portal` on the new Sites tab.
- No other edge-function changes. No schema changes.

## Technical notes
- All BYOW DB tables/RLS already restrict by `owner_user_id`; CustomerPortal already authenticates with Supabase, so the existing policies cover the new Sites tab with zero changes.
- Realtime subscription on `byow_messages` is moved into `ByowBuilderPane`.
- The Studio sub-section uses the same `has_role(auth.uid(), 'admin')` check Portal already enforces at the page level — no extra gating needed.
- Lander pricing buttons for unauthenticated users hit `byow-create-checkout` directly (no login wall); for users already signed in they pass their existing site_id if any.

## Out of scope
- No copy beyond the lander itself (no rewriting `/packages` etc.).
- No changes to Stripe products/prices — reuses the existing IDs in `_shared/byow-pricing.ts`.
- No changes to other portal tabs.
