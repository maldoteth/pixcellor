## Problem

On the hero, tapping seemingly empty black areas (left/right of the visible portfolio carousel) opens random portfolio websites. The FlipCards in the morph animation were already fixed to scroll the page, so they are not the culprit.

The remaining culprits are the **CircularGallery cards** (`src/components/ui/circular-gallery.tsx`). The gallery is a 3D ring of 16 cards positioned with `rotateY(angle) translateZ(radius)`. At any moment only ~5 cards face the viewer at the front of the ring — the rest are on the **back half of the ring**, behind the camera plane, invisible (or barely visible at the sides), but still rendered with:

- `pointer-events-auto` on the outer wrapper
- `cursor-pointer` + `onClick` that calls `window.open(item.photo.by, '_blank')`
- no `backface-visibility: hidden`

So a tap on apparently empty black space to the left, right, or behind the visible cards actually lands on a back-facing card's hit-box and opens that card's external URL. This matches the user's "buttons in the black screen" report.

## Fix

In `src/components/ui/circular-gallery.tsx`, make only the **front-facing** cards interactive:

1. Reuse the already-computed `normalizedAngle` (0 = directly facing camera, 180 = directly behind).
2. Define `isFrontFacing = normalizedAngle < 75` (front cone only — generous enough to cover the visible arc, tight enough to exclude side/back cards in the black areas).
3. On the outer absolutely-positioned card wrapper:
   - When not front-facing: set `pointerEvents: 'none'` and skip `cursor-pointer`.
   - Always add `backfaceVisibility: 'hidden'` (and `WebkitBackfaceVisibility`) so back halves of the ring also cannot intercept events even if the angle math drifts.
4. On the inner clickable `<div role="link">`:
   - Conditionally render `onClick`, `onKeyDown`, `tabIndex`, `role`, `aria-label`, and `cursor-pointer` only when `isFrontFacing`.
   - When not front-facing, also set `pointerEvents: 'none'` on this inner div.

No other component changes. FlipCard behaviour (scroll on tap) stays as-is. Visuals, rotation driver, sizing, mobile/desktop layout, and the front cards' click-to-open behaviour are unchanged.

## Verification

- Tap empty black area to the left/right of the visible carousel → nothing happens (previously opened a random portfolio).
- Tap a clearly visible front card → opens that portfolio's site (unchanged).
- Tap on hero text / arrows → unchanged behaviour (scroll controls still fire).
- Keyboard tab order: only front-facing cards are focusable, which is also a UX improvement.

## Out of scope

FlipCard logic, scroll sensitivity, hero text, arrows, CircularGallery rotation/visuals, and any other component.
