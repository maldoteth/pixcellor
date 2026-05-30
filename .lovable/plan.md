# SEO Cleanup — All Four Fixes

## 1. Auto-generated sitemap (fixes stale `lastmod`)

- Create `scripts/generate-sitemap.ts` listing all 27 public routes (18 service slugs + `/`, `/services`, `/legal`, `/legal/terms|privacy|refund|acceptable-use`).
- Use today's date for `lastmod` on every build/dev.
- Add `predev` + `prebuild` scripts to `package.json` running `bunx tsx scripts/generate-sitemap.ts`.
- Existing `public/sitemap.xml` is overwritten on next build — same path, same format, no crawler disruption.

## 2. Sitewide Organization + WebSite JSON-LD

- Inject into `index.html` `<head>` (sitewide, picked up by Google for knowledge-graph / brand recognition).
- Include: name "Pixcellor™", url, logo, sameAs (social links if known), founder/contact if available.
- Add a `WebSite` block with `potentialAction` SearchAction stub for future site search.

## 3. LCP fix — hero performance, **without staggering image appearance**

The Lighthouse finding is about the hero's largest paint being slow. Fixes that DO NOT affect simultaneous appearance:

- Add `fetchpriority="high"` + `decoding="async"` to the hero's primary image asset(s) so the browser prioritises their bytes.
- Add `<link rel="preload" as="image" href="<hero-image>" fetchpriority="high">` in `index.html` for the first hero card image(s) so they start downloading before JS parses.
- Add `font-display: swap` to any `@font-face` declarations in `src/index.css` so text paints with a fallback while web fonts load (no impact on images).
- Remove any `loading="lazy"` on above-the-fold hero imagery (lazy = late = LCP miss).

**Constraint respected**: the existing entrance animation (which makes all hero cards appear together via Framer Motion) is untouched. We only speed up *byte delivery*, not change the animation choreography. All cards will continue to fade/morph in simultaneously as they do today.

## 4. Google Search Console connection

- Trigger the `google_search_console` connector picker so you authorize OAuth.
- Request a META verification token, inject `<meta name="google-site-verification" content="...">` into `index.html`.
- Once you publish, call the verify endpoint, then add `https://pixcellor.com/` as a Search Console property and submit the sitemap URL programmatically.
- You'll then see impressions, clicks, queries, and index coverage in GSC within ~48h.

## Order of operations

1. Write sitemap generator + wire npm scripts → regenerate file
2. Add Organization/WebSite JSON-LD to `index.html`
3. Hero LCP: `fetchpriority`, preload link, `font-display: swap`, strip any above-fold `loading="lazy"`
4. Trigger GSC connector → inject verification meta → you publish → I verify + submit sitemap
5. Mark both SEO findings fixed in the scanner

## Files touched

- `scripts/generate-sitemap.ts` (new)
- `package.json` (predev/prebuild scripts)
- `public/sitemap.xml` (regenerated)
- `index.html` (JSON-LD, preload, GSC verification meta)
- `src/index.css` (font-display: swap if any @font-face rules exist)
- Hero image component (fetchpriority/decoding attrs; no animation changes)

## What you'll need to do

- **Publish** after step 3 so the verification meta is live on `pixcellor.com` — then I run the verify call.
- Authorize the Google Search Console connector when the picker appears.
