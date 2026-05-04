I found what’s going on: the footer is technically rendering on mobile, but it sits behind/under the carousel area because its stacking layer is too low and the carousel/cards overlap the bottom of the viewport on mobile. On the tested mobile sizes, the footer only becomes visible when the consent banner is gone, and on some aspect ratios it is partially hidden or visually swallowed by the carousel/dark overlay.

Plan:

1. Make the footer a true mobile foreground layer
   - In `src/components/ui/scroll-morph-hero.tsx`, raise the footer wrapper above the carousel/cards so it is not covered by the portfolio gallery.
   - Keep it anchored to the viewport bottom with safe-area support.

2. Make footer visibility instant and deterministic
   - Keep the footer hidden at the initial home state.
   - Switch it to full opacity immediately once `virtualScroll >= HERO_MORPH_END`, i.e. when the carousel/portfolio appears.
   - Remove the unused spring/translate code that currently suggests a fade/slide but is not actually used.

3. Prevent the carousel from occupying the footer’s space on mobile
   - Adjust the mobile gallery bottom spacing so cards do not sit directly over the footer strip.
   - Desktop/tablet layout can stay as-is unless the same overlap is visible there.

4. Verify on mobile aspect ratios
   - Check narrow/short phone size like `320x568`.
   - Check standard iPhone/Samsung-like sizes like `390x844` and `414x896`.
   - Confirm the footer is invisible on initial home view and visible at full brightness as soon as portfolio/carousel appears.