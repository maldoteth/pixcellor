I’ll fix this by removing the hard viewport boundary that currently separates the hero/portfolio animation from the services page.

What I’ll change:

1. Make the hero/portfolio area taller than one screen
   - Replace the current `h-screen overflow-hidden` wrapper with a taller, continuous section.
   - This lets the services section physically overlap/follow the animated portfolio area instead of starting after a clipped 100vh box.

2. Stop hijacking all scroll until the animation is complete
   - Change the animation from a fully intercepted “virtual scroll” to a scroll-position-driven animation.
   - As the user scrolls normally, the animation will keep progressing, but the page will also move down naturally at the same time.
   - This means users can start entering the services section before the card arc animation fully finishes.

3. Let the animation flow into page 2
   - Remove the hero component’s `overflow-hidden` clipping on the vertical axis so the card arc can visually extend beyond the first-screen boundary.
   - Keep horizontal overflow controlled so the page doesn’t create sideways scrolling.

4. Blend the services section into the portfolio area
   - Pull the services section upward with negative margin / overlapping layout so there is no visible straight “invisible line” at the top.
   - Adjust its background/radial lighting so it feels like a continuation of the same black stage rather than a new page.

5. Keep floating controls sane
   - Keep Customer Access and ChatBot tied to early hero scroll state, but update the threshold if needed so they don’t disappear too early or linger into the services content.

Files to update:
- `src/pages/Index.tsx`
- `src/components/ui/scroll-morph-hero.tsx`
- `src/components/ServicesSection.tsx`

Expected result:
- The portfolio cards can continue animating while the page scrolls down.
- The services section begins naturally below/behind the animation instead of only appearing after animation completion.
- No hard horizontal seam or invisible line between portfolio and services.
- Footer remains at the true bottom after services.