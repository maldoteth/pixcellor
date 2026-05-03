## Plan

Fix the carousel so it does not preload halfway or near the end of its spin. The carousel should be at its starting rotation when it first appears, then rotate only as the user continues scrolling through the carousel section.

## What I will change

1. Keep the existing hero/first animation scroll behavior unchanged.
2. Decouple the carousel rotation from the early hero morph scroll range.
3. Move the carousel rotation start point to after the “What We Do” / carousel reveal point, so it starts at `0°` when visible.
4. Preserve the current rotation amount:
   - Desktop: up to 2 full turns.
   - Mobile/tablet: reduced rotation amount so it is less sensitive.
5. Make sure the carousel still uses the same visible fade timing as the “What We Do” content.

## Technical change

In `src/components/ui/scroll-morph-hero.tsx`, update the `galleryRotation` transform so its input range starts later than the reveal phase instead of starting at `virtualScroll = 600`.

Current issue:

```ts
const galleryRotation = useTransform(
  virtualScroll,
  [600, 3000],
  isSmallViewport ? [0, 144] : [0, 720]
);
```

Because the carousel also fades in after the morph phase, the rotation has already advanced before the user can see it.

Planned fix:

```ts
const galleryRotation = useTransform(
  virtualScroll,
  isSmallViewport ? [1400, 3000] : [1200, 3000],
  isSmallViewport ? [0, 144] : [0, 720]
);
```

This keeps the first animation intact and changes only the carousel spin timing.