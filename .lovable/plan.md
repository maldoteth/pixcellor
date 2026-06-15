
## Goal

On `/byow`, replace the **How it works** section with an interactive **Create your site** wizard. Anyone can run it for free and gets a unique preview URL `pixcellor.com/s/{ref}`. Publishing / unlocking edits requires checkout (the existing plans).

## User flow (wizard)

```text
1. Brief         → site name + 1-line description + business type
2. Template      → pick a curated preset OR "generate fresh from brief"
3. Branding      → upload logo, pick brand colours (primary / accent / bg / text),
                   pick 3 fonts (title / subtitle / body) from a curated list
4. Generate      → AI produces sections JSON (hero, features, pricing, FAQ, contact, footer)
                   Loading state with progress copy
5. Preview       → live render at /s/{ref}, "Share", "Regenerate section", "Publish (paywall)"
```

Every step is one card, no full-page navigation. Progress bar + Back/Next.

## Generated output shape

Single-page site stored as JSON sections:

```ts
type SiteDoc = {
  ref: string;            // 6-char short id, used in URL
  brand: { logo_url?: string; colors: {...}; fonts: {...} };
  template_key?: string;  // preset slug or null when fresh
  sections: Array<
    | { type: "hero"; headline; sub; cta; image? }
    | { type: "features"; title; items: {icon; title; text}[] }
    | { type: "pricing"; title; tiers: {...}[] }
    | { type: "faq"; items: {q;a}[] }
    | { type: "contact"; email; form?: boolean }
    | { type: "footer"; links: {label;href}[] }
  >;
};
```

Renderer is a single React component (`<PublicSiteRenderer doc={...} />`) that maps section types to existing styled components.

## Database

New tables (one migration):

- `public.byow_generated_sites`
  - `id uuid pk`, `ref text unique` (6 chars), `owner_user_id uuid null`, `email text null`,
    `display_name text`, `doc jsonb not null`, `status text` (`draft` | `published`),
    `published_at timestamptz null`, `created_at`, `updated_at`
- `public.byow_site_assets` (logo uploads)
  - `id uuid pk`, `site_id uuid fk`, `kind text`, `storage_path text`, `created_at`
- Storage bucket: `byow-site-assets` (public read for logos).

RLS:
- Anyone may `INSERT` a draft (anon allowed) and `SELECT` by `ref` (public read).
- Only `owner_user_id = auth.uid()` may update / publish.
- Edge functions use service role for AI write-back.

## Edge functions

- `byow-generate-site` — POST `{ ref?, brief, brand, template_key }`. Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with a structured-JSON schema matching `SiteDoc.sections`. Inserts/updates row. Returns `{ ref, doc }`. Rate-limited per IP (in-memory map fine for now).
- `byow-upload-logo` — POST multipart; stores in `byow-site-assets`, returns public URL.
- `byow-publish-site` — POST `{ ref }`. Requires auth + active subscription on this site OR triggers checkout (re-use existing `byow-create-checkout` with `lander:true` + `site_ref` in metadata). On webhook success, set `status='published'`.

## Frontend changes

- **`src/pages/ByowLanding.tsx`**
  - Replace the `STEPS` "How it works" section with `<CreateSiteWizard />`.
  - Keep hero, benefits, pricing, FAQ.
- **`src/components/byow/CreateSiteWizard/`** (new)
  - `index.tsx` — stepper shell, holds wizard state, calls edge functions
  - `StepBrief.tsx`, `StepTemplate.tsx`, `StepBranding.tsx`, `StepGenerate.tsx`, `StepPreview.tsx`
  - `templates.ts` — 6 curated presets (Salon, SaaS, Restaurant, Consultant, Portfolio, Local trades) — each a partial `SiteDoc`
  - `fontPresets.ts` — 8 title/subtitle/body triples (Inter+Inter+Inter, Space Grotesk+Inter+Inter, Playfair+Inter+Inter, etc.) loaded via Google Fonts `<link>` injection
  - `ColorPicker.tsx`, `LogoUpload.tsx`
- **`src/components/byow/PublicSiteRenderer.tsx`** (new) — renders `SiteDoc` with brand vars applied via inline CSS variables.
- **`src/pages/PublicSite.tsx`** (new) — fetches `byow_generated_sites` by `ref`, renders `<PublicSiteRenderer />`. SEO via `<SeoHead>`.
- **`src/App.tsx`** — add route `/s/:ref` → `PublicSite`.
- **`src/pages/CustomerPortal.tsx` → ByowSitesTab** — surface generated sites under the user's account once they sign up (link draft refs by email at signup).

## Paywall behaviour

- Preview at `/s/{ref}` is fully visible (free), with a sticky banner: *"Preview — publish to claim your subdomain and edits."*
- "Publish" button triggers `byow-create-checkout` (existing flow) passing the `ref`. Webhook attaches `owner_user_id` to the site row and sets `status='published'`.
- Edits beyond regeneration require an active plan (uses existing prompt-quota system).

## Out of scope (for this PR)

- Real `xxxxx.pixcellor.com` wildcard hosting — using `/s/{ref}` per your answer; trivial to swap to subdomain later by adding a host-based router.
- Multi-page generation.
- Editing individual section copy in-place (regenerate-only for now).

## Files touched

- New: migration, 3 edge functions, `PublicSite.tsx`, `PublicSiteRenderer.tsx`, 7 wizard files
- Edited: `ByowLanding.tsx`, `App.tsx`, `CustomerPortal.tsx` (sites tab integration)
