## Plan

The previous change reduced blur effects, but it did not fix the real cause: the title/subtitle are still inside the same 3D-transformed card, so the browser rasterizes the text and then stretches/warps it with perspective.

I will change the gallery so the image cards can stay in the 3D carousel, but the visible text label is rendered as a separate flat overlay layer in screen space.

## What will change

1. **Separate text from the 3D card**
   - Remove the title/subtitle label from inside each rotating card.
   - Keep only the image, tint, and click target inside the 3D transformed card.

2. **Add a crisp overlay label for the front card**
   - Compute which card is currently closest to the front.
   - Render that card’s title and subtitle in a normal 2D overlay above the carousel, not inside `rotateY(...) translateZ(...)`.
   - This avoids GPU perspective resampling of text, so the typography should look sharp/high-def.

3. **Keep the same visual style**
   - Reuse the existing dark glass/tinted label styling.
   - Keep the label positioned at the bottom of the active card area.
   - Preserve click behavior on the front card.

4. **Remove text-blurring leftovers**
   - Remove unnecessary text-related transforms/shadows/backdrop effects that are no longer needed on the card itself.
   - Keep the carousel animation and portfolio data unchanged.

## Technical details

- Main file: `src/components/ui/circular-gallery.tsx`
- Supporting style cleanup: `src/index.css`
- No backend, data, package, or business-logic changes.
- The fix targets the root issue: text should no longer be a texture inside a 3D-transformed layer.