## Goal

Replace the rainbow streaking tubes animation in the **Full Web Apps** drawer with a pixelated multi-coloured grid that lights up cells as the cursor moves across them. Keep the streaking tubes on **Animated Sites**.

## What changes

1. **New scene: `src/components/services/FullWebAppsHero.tsx`**
   - Reuses the existing `Boxes` component from `src/components/ui/background-boxes.tsx` (an Aceternity-style tilted grid where each cell flashes a random colour on hover — exactly the "pixelated row of boxes, multi-coloured, follows mouse" feel).
   - Wraps it on a black background with a radial fade mask (same pattern the original `LandingPagesHero` used) so the grid blends into the dark frame.

2. **`src/components/services/ServiceSalesView.tsx`**
   - Import `FullWebAppsHero`.
   - Top hero block: split the `animated-sites || full-web-apps` branch — `full-web-apps` renders `<FullWebAppsHero />`, `animated-sites` keeps `<TubesCursor />`.
   - Footer CTA block: same split — `full-web-apps` shows the boxes scene as the backdrop, `animated-sites` keeps the tubes.

## Notes / constraints

- Hover/cursor interactivity already works on desktop in `Boxes` (per-cell `whileHover`); matches the project's "cursor-following animations are desktop-only" rule since `whileHover` is a no-op on touch.
- No changes to `tubes-cursor.tsx` — the rainbow tubes stay on Animated Sites.
- No data/service-definition changes.

## Files touched

- add: `src/components/services/FullWebAppsHero.tsx`
- edit: `src/components/services/ServiceSalesView.tsx` (4 small conditional tweaks)
