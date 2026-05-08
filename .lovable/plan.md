# Fix: touch sensitivity on touch-screen desktops/laptops

## Problem

In `src/components/ui/scroll-morph-hero.tsx`, scroll boost is picked purely from viewport width:

```
boost = w < 768 ? 24 : w < 1024 ? 12 : 1
```

This boost is applied to BOTH wheel events AND touch events. Wheel events at desktop widths come with large `deltaY`, so `boost = 1` is correct for them. But touch events deliver tiny per-frame pixel deltas (often 1–5 px between `touchmove` events), which get the same `boost = 1` on a ≥1024px touch-screen laptop — feeling sluggish/unresponsive. Switching the same laptop to mobile-emulation mode shrinks the viewport under 768, so it picks up the 24× mobile boost and feels fine.

The boost should depend on **input type** (touch vs wheel), not just on viewport width.

## Fix

Decouple touch boost from wheel boost in the touch handler only — leave wheel behavior unchanged so trackpad/mouse-wheel users on the same laptop are not affected.

1. Add a constant near the existing boost constants (line ~140):
   ```
   const DESKTOP_TOUCH_BOOST = 12; // matches tablet feel for ≥1024px touch screens
   ```

2. In `handleTouchMove` (line ~336), replace the width-based boost lookup with one that guarantees a touch-friendly boost at every width:
   ```
   const boost = w < 768 ? MOBILE_SCROLL_BOOST
              : w < 1024 ? TABLET_SCROLL_BOOST
              : DESKTOP_TOUCH_BOOST;
   ```
   `handleWheel` (line ~259) is left untouched — wheel still uses `1` at ≥1024px.

3. No other behavior changes: gesture-axis detection, swipe-to-advance direction, overlay/flipbook exclusions, and the carousel multiplier all stay as-is.

## Out of scope

- Desktop wheel/trackpad sensitivity (already correct).
- Mobile and tablet touch behavior (unchanged — same constants).
- The drawer touch hook (`use-drawer-touch-scroll.ts`) — separate concern, not reported as broken.

## Verification

After the change, on a ≥1024px viewport using touch input, a swipe should advance the virtual scroll at roughly the same rate as the tablet (768–1023) breakpoint, while a mouse wheel on the same machine continues to behave as it does today.
