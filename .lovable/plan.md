# Performance Optimization Plan

Goal: cut FCP/LCP on pixcellor.com (currently ~2.1s FP / 3.7s FCP) and shrink the 286KB main bundle.

## 1. Code-split heavy routes (biggest win)
Currently `src/App.tsx` imports every page eagerly, so the 286KB main bundle contains code for `/portal`, `/admin`, `/customer-portal`, `/portfolio`, vision wizard, etc. — even for the home-page visitor.

- Convert all non-essential routes in `src/App.tsx` to `React.lazy(() => import(...))` wrapped in `<Suspense fallback={null}>`.
- Keep `Index` (`/`) eager so the home page paints instantly.
- Lazy-load: `/portal/*`, `/customer-portal/*`, `/admin`, `/portfolio`, `/services`, `/services/:slug`, `/packages/:slug`, `/legal`, `/order-success`, `/vision-preview`, `/edit-request`, `/project-requirements`, `/auth-handoff`, `/customer-auth`, `/portal-auth`, `/candidate-apply`, `/vacancy-respond`, `/reset-password`, `/unsubscribe`, `NotFound`.
- Expected: main bundle ~286KB → ~120–150KB, FCP -0.8s to -1.2s.

## 2. Preload the LCP wordmark
Add to `index.html` `<head>`:
```html
<link rel="preload" as="image" href="/assets/<hashed>.png" fetchpriority="high" />
```
Since Vite hashes the filename, use the import path via a build-time approach — instead, add `<link rel="preload">` for the public copy of the wordmark, OR move the wordmark to `/public/pixcellor-wordmark-white.png` and reference it directly so we can preload by static URL.

- Pushes LCP from ~2.1s to under 1.5s.

## 3. Defer analytics XHR (1.4s blocker)
`/~api/analytics` fires during initial load and takes ~1.4s. Wrap any analytics calls in `requestIdleCallback` (with `setTimeout` fallback) so they run after LCP.

- Find the call site (likely `src/main.tsx` or `src/App.tsx` or a tracking hook) and defer.

## 4. Lazy-load below-the-fold portfolio thumbnails
68 portfolio images load in the first second (~2.3MB total). Confirm `loading="lazy"` + `decoding="async"` on every `<img>` in `Portfolio.tsx` / portfolio book / sliders, and ensure no `fetchpriority="high"` is set on non-LCP imgs.

## 5. Re-verify
After ship, re-run performance profile on pixcellor.com and report new FCP / LCP / bundle size.

## Out of scope (for now)
- Tree-shaking Framer Motion (already mostly necessary).
- Server-side rendering / SSG.
- Switching off the Vite dev preview overhead.

## Files touched
- `src/App.tsx` — convert route imports to `React.lazy` + `Suspense`.
- `index.html` — add `<link rel="preload">` for wordmark.
- `public/pixcellor-wordmark-white.png` — move from `src/assets` (or symlink/copy).
- `src/components/ui/scroll-morph-hero.tsx` — swap import to the public URL string.
- Analytics call site (TBD on read) — defer to idle.
- `src/pages/Portfolio.tsx` and portfolio image components — audit `loading`/`fetchpriority`.

No DB, edge function, or backend changes.
