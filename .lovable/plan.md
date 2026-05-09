# Why the portfolio card text looks rough/stretched

The text isn't actually stretched — it's being rasterized once and then resampled by the GPU. Three things in `CircularGallery` and the label styles combine to soften it:

1. **3D transform on each card** (`rotateY(...) translateZ(...)` + `transformStyle: preserve-3d` + `backfaceVisibility: hidden` in `circular-gallery.tsx`). Each card lives on a tilted plane behind a `perspective: 1200px` container. Even the "front" card is rarely at exactly 0°, so its text plane is slightly skewed — the browser rasterizes the text at the card's CSS size (138×184) and the GPU then warps that bitmap with perspective. That's the "stretched / not high‑def" feeling.

2. **`filter: brightness(...)` on every card** (line 248 of `circular-gallery.tsx`). `filter` forces the element into its own composited layer, rasterized at its CSS pixel size and then transformed. Combined with the 3D rotation this guarantees blurry text, especially on a 1.125 devicePixelRatio screen like yours.

3. **`drop-shadow` on the title and subtitle + the `carousel-label-glass` backdrop-filter / `::after` blur**. `drop-shadow` is also a filter and double‑rasterizes the text. The glass layer sits on top with heavy `backdrop-filter: blur(34px) saturate(190%) brightness(0.92)` which softens contrast under the text.

So nothing is literally scaled — the text is rendered at its real size, but it's being baked into a bitmap and then perspective-warped, which destroys the crisp subpixel anti‑aliasing.

## Proposed fix (visual only, no business logic)

In `src/components/ui/circular-gallery.tsx`:

- Remove `filter: brightness(depthDim)` from the per-card wrapper (line 248). Replace the dim with a non-filter darken: a black overlay div inside the card with `opacity: 1 - depthDim` (no filter, no extra layer split for text).
- Add `will-change: transform` and `transform: translateZ(0.01px)` to the label container so the label gets its own crisp layer instead of being baked into the warped card raster. Optionally render the label with `transform: translateZ(1px)` so it sits a hair in front of the image plane — this also helps Safari sample text at native resolution.
- Drop `drop-shadow` on `<h3>` / `<p>` (lines 151–152) and replace with a CSS `text-shadow` (cheaper, no filter layer).

In `src/index.css` (`.carousel-label-glass`):

- Reduce `backdrop-filter` from `blur(34px) saturate(190%) brightness(0.92)` to something lighter like `blur(14px) saturate(140%)`, and remove the `::after` blurred halo (or move it behind the text with `z-index: -1` — already there, but the `filter: blur(16px)` on it forces the parent into a filter context). Keeping a single, lighter glass layer keeps text crisp.
- Add `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;` on the label container.

Optional: bump card size on desktop slightly (e.g. `cardW = 156`, `cardH = 208`) so the title isn't rendering near the smallest legible size — this is the single biggest perceived‑sharpness win because text rasters get more source pixels before the perspective warp.

## Technical notes

- The root cause is that any `filter`, `backdrop-filter`, or `will-change: transform` ancestor turns the subtree into a single GPU texture sized to its CSS box; subsequent 3D transforms then resample that texture. Removing the per-card `filter` is the highest‑impact change.
- `backface-visibility: hidden` is fine to keep — it doesn't cause rasterization on its own, but combined with `filter` it compounds the issue.
- No changes needed to the gallery rotation/scroll logic.

Want me to apply the fix as described, or would you prefer a more minimal pass (just remove the per‑card `filter` and the `drop-shadow`s) to see how much that alone improves it?
