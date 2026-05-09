## Goal
On mobile, the per-card coloured glow should be **off by default** and only light up while the user is actively touching the screen — either tapping near a card or dragging around the circular gallery. Desktop behaviour stays exactly as it is.

## Current state
`src/components/ui/circular-gallery.tsx` renders each card with a static `box-shadow` glow. There is no touch tracking, and on mobile the glow is essentially invisible against the black background anyway.

## Approach (frontend only, single file)

### 1. Track touch position at the gallery root
In the `CircularGallery` forwardRef component:
- Add state `touchPoint: {x, y} | null` and `isTouching: boolean`.
- Attach `onTouchStart`, `onTouchMove`, `onTouchEnd`, `onTouchCancel` to the outer wrapper `<div>`.
- On start/move: store the touch's clientX/clientY relative to the wrapper's bounding rect.
- On end/cancel: clear `touchPoint` and set `isTouching = false` (with a short ~150ms fade-out timer so the glow eases off rather than snapping).
- Gate all of this behind the existing `isMobile` flag — desktop ignores touch entirely and keeps current static glow.

### 2. Compute per-card proximity
For each card the parent already knows its on-screen position (it's positioned via 3D transform around the ring). Easiest reliable way:
- Give each card wrapper a `ref` (array of refs).
- In a `requestAnimationFrame` loop that runs only while `isTouching`, read each card's `getBoundingClientRect()` centre, compare to the current touch point, and compute a `proximity` value: `1` when the touch is on the card, falling to `0` past ~140px away (tunable).
- Store proximities in a ref-backed array and force a lightweight re-render (or pass via context) so `GalleryCard` can read its own value.

Trade-off note: reading rects every frame for ~10 cards is cheap. If we want to avoid the rAF loop, we can compute proximity from the card's known angle vs the touch's angle around the ring centre — happy to use that variant if preferred (simpler, no DOM reads).

### 3. Render the glow only when active (mobile)
In `GalleryCard`:
- Accept new props: `glowIntensity: number` (0–1) and `mobileMode: boolean`.
- When `mobileMode` is true:
  - Remove the static `box-shadow` glow.
  - Render a sibling halo `<div>` behind the image (absolute, `inset: -20px`, radial-gradient using the card's dominant colour, `filter: blur(16px)`, `pointer-events: none`).
  - Set its `opacity` to `glowIntensity` and transition opacity over ~120ms so it feels responsive but not jittery.
  - Restructure the card so the halo can sit outside the image's `overflow-hidden` clip (move image + overlays into an inner `overflow-hidden` wrapper; outer wrapper is transparent and *not* clipped).
- When `mobileMode` is false: keep today's static `box-shadow` glow exactly as is.

### 4. Drag-around-the-ring case
The user also wants the glow active while dragging around the circle. Two sub-cases:
- **Vertical scroll-drag** (the existing rotation driver): treat any active touch as "interacting", regardless of whether it's directly on a card. While `isTouching` is true, every card gets a baseline glow (e.g. `0.25`), and the card closest to the touch point gets boosted toward `1.0`.
- **Tap on a single card**: same code path — proximity to the touched card pushes its glow to `1.0`, others fade based on distance.

This means the rule is simply: glow opacity per card = `max(baseline-while-touching, proximity-to-touch)`.

### 5. Accessibility & perf
- `pointer-events: none` on the halo so it never intercepts taps.
- `will-change: opacity` only while `isTouching`, removed on touchend, to avoid permanent compositor layers.
- No changes for users with `prefers-reduced-motion` beyond the existing behaviour (the halo just fades; no large motion).

## Out of scope
- No changes to rotation/scroll logic.
- No changes to desktop appearance.
- No changes to colours, sizing, or other components.

## Verification
- Mobile viewport (≤767px): cards show **no glow** at rest. Touching and holding near a card lights that card brightest with a soft falloff on neighbours; releasing fades the glow out within ~150ms. Dragging around the ring keeps a baseline glow active and the closest card boosted.
- Desktop viewport (≥768px): visually identical to current behaviour.
- Quick scroll/drag test: no jank, no leftover glow after lifting the finger.
