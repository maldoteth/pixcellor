# Why the hero glow doesn't work on your Samsung

The hero `FlipCard` (`src/components/ui/scroll-morph-hero.tsx`, line 97–125) starts its proximity tracker with this gate:

```ts
const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (!isFinePointer) return;
```

On a Samsung phone the browser reports `pointer: coarse` / `hover: none`, so the effect bails immediately and never attaches any listener. The Lovable dev preview "works fine" because you're viewing it on a desktop browser (fine pointer + hover) — the same code on your phone would also fail there. It has nothing to do with build vs. preview, gesture provenance, or Samsung Internet quirks. It's just a desktop-only feature today.

The CircularGallery (the carousel ring lower down) has its own touch-driven glow loop, which is why that one does light up on mobile.

# Plan: add touch-driven glow to the hero cards

Mirror the pattern already used in `CircularGallery` so a finger near a hero card lights it up, and dragging across the arc lights up whichever card is closest.

## Behaviour

- Desktop (fine pointer): unchanged — current `pointermove` proximity loop stays.
- Touch devices (coarse pointer):
  - On `touchstart` / `touchmove` anywhere over the hero, compute proximity per card from the finger position to each card's centre (same falloff as desktop, ~280px radius scaled for mobile card size).
  - On `touchend` / `touchcancel`, fade glow back to 0 over ~150ms.
  - Tap directly on a card: that card briefly hits full glow, neighbours falloff naturally.
  - Drag across the arc: the nearest card stays lit and others falloff smoothly.

## Where the change lives

Single file: `src/components/ui/scroll-morph-hero.tsx`.

Two small additions inside `FlipCard`:

1. Replace the desktop-only gate with a branch:
   - If fine pointer → keep the existing `pointermove` listener.
   - Else → attach `touchstart` / `touchmove` / `touchend` / `touchcancel` to `window` (passive), driving the same `setProximity` state with the same rAF throttle and falloff math.
2. Add a fade-out timer (rAF loop that decays `proximity` toward 0) triggered on touchend, so the glow doesn't snap off.

No prop changes, no parent changes. Glow rendering (`hoverScale`, `glowAlpha`, `glowBlur`, `glowSpread`) is reused as-is, so visuals stay identical — only the input source changes.

## Tuning notes

- Touch radius: keep `PROXIMITY_RADIUS = 280` but consider 220 on `< 768px` viewports because the cards are smaller and closer together; otherwise every card lights up at once.
- Listeners attach to `window` (not the card) so swipe-and-glide across the arc keeps updating proximity even as fingers leave any single card.
- All listeners are `{ passive: true }` so we don't interfere with the existing virtual-scroll touch handler in the hero.

## Out of scope

- The CircularGallery carousel glow (already works on mobile).
- Any visual restyling of the glow itself.
- Scroll/morph behaviour or card layout.
