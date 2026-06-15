## Goal

Stop the BYOW wizard from producing generic AI-soup sites. Force users to pick from a curated catalog of real, opinionated layouts before generating, and surface a clear path to hire the Pixcellor team for deeper customisation.

## Why 30 curated layouts, not 100 scraped ones

Scraping 100 third-party free templates (HTML5 UP, Cruip, Tailblocks, etc.) and serving their HTML is a licensing/branding minefield — we'd be republishing other people's work. Instead we build **30 named templates we own**, each with:
- a distinct layout/structure (sections, order, density)
- a curated colour mood and font pairing
- a generated preview thumbnail
- a rich seed that locks the AI into that structure instead of free-styling

This produces predictable, on-brand sites and lets us legally polish each one. We can grow past 30 later.

## Catalog (30 templates, grouped)

```text
LOCAL SERVICE       SAAS / PRODUCT       HOSPITALITY         CREATIVE
- Salon Calm        - SaaS Bold          - Restaurant Story  - Studio Mono
- Salon Editorial   - SaaS Minimal       - Cafe Warm         - Studio Color
- Barber Heritage   - AI Product         - Bar Nightlife     - Photo Folio
- Trades Local      - Dev Tool           - Hotel Boutique    - Agency Grid
                    - Mobile App                             - Designer Bento

PROFESSIONAL        ECOMMERCE            EVENTS / COMMUNITY  PERSONAL
- Consultant Trust  - Shop Minimal       - Event Landing     - Coach 1:1
- Lawyer Editorial  - Single Product     - Community Hub     - Author Book
- Clinic Calm       - Lookbook                               - Personal CV
- Finance Pro                                                - Newsletter
```

Each template card shows:
- A 16:10 thumbnail (generated once with imagegen, stored under `src/assets/byow-templates/`)
- Name + industry tag
- One-line blurb describing the layout's vibe
- A "Customise with our team →" link on hover

## UX flow changes

1. **Step 1 (Brief)** — unchanged except: import-from-URL still works.
2. **Step 2 (Template)** — REQUIRED selection. Remove the "Generate fresh" tile. Replace with a 3-column grid of 30 thumbnail cards with category filter chips (All / Service / SaaS / Hospitality / Creative / Pro / Ecom / Events / Personal). Next disabled until one is picked. Below the grid: a glass card "None of these fit? Hire our team to design + build your dream site →" linking to `/get-started`.
3. **Step 3 (Branding)** — unchanged.
4. **Step 4 (Generate)** — copy update: "We're styling your **{template label}** layout with your brand". Add a subtle "Want pixel-perfect, human-built? Talk to our team" link under the generate button.

## Generator changes

`supabase/functions/byow-generate-site/index.ts`:
- Make `template_key` required; reject the call with 400 if missing.
- Pass the template's `seed.sections_hint`, `tone`, `audience`, and a new `layout_recipe` field into the LLM prompt as hard constraints, not suggestions ("You MUST follow this section order and density…").
- Keep the existing schema.

## Files

```text
src/components/byow/CreateSiteWizard/templates.ts        # expand to 30 entries with layout_recipe
src/components/byow/CreateSiteWizard/index.tsx           # step 2 redesign, required selection, hire CTA
src/assets/byow-templates/{slug}.jpg × 30                # generated thumbnails
supabase/functions/byow-generate-site/index.ts           # require template_key, stricter prompt
```

## Out of scope

- No third-party template scraping/embedding.
- No new pricing or backend tables.
- Existing generated sites keep working.

## Build order

1. Expand `templates.ts` to 30 entries with `layout_recipe`.
2. Generate 30 thumbnails in parallel (imagegen fast tier).
3. Rebuild step 2 of the wizard: filter chips, grid, required selection, hire-team upsell.
4. Tighten the generator prompt and require `template_key`.
5. Add the "hire our team" link on step 4.
