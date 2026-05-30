## Why the carousel looks blurry

The portfolio cards in `CircularGallery` (`src/components/ui/circular-gallery.tsx`) are served from pre-generated responsive variants built by `scripts/convert-portfolio.mjs`:

- `*-sm.avif` / `*-sm.webp` — 480px wide, AVIF **quality 50**, WebP quality 78
- `*-lg.avif` / `*-lg.webp` — 960px wide, same qualities
- Original `*.png` kept only as fallback

The `<picture>` in `GalleryCard` declares:

```ts
sizes = '(max-width: 768px) 240px, 360px'
srcSet: '...-sm.(avif|webp) 480w, ...-lg.(avif|webp) 960w'
```

Each card actually renders at only 138×184 CSS px on desktop (100×144 on mobile), but with `devicePixelRatio` ≈ 1.25–2 and the 3D perspective scaling cards near the camera, the visible raster is somewhere between ~200 and ~480 device px wide. With `sizes: 360px` the browser picks the **sm (480w)** variant on essentially every device. That variant is:

1. Encoded at AVIF q=50, which is aggressive for screenshot-style UI imagery (sharp text, thin lines, flat color blocks compress poorly and go mushy).
2. The lg (960w) variant is almost never selected, so the higher-quality asset we already ship is wasted.

So the blur isn't a layout bug — it's an asset-quality bug. The sm variant is doing all the work and it's too compressed for the detail in website screenshots.

## Fix

Two coordinated changes, no behaviour changes elsewhere.

### 1. Regenerate sharper variants (`scripts/convert-portfolio.mjs`)

- Raise AVIF `quality` from 50 → ~70 and `effort` from 4 → 6 (slower build, smaller+sharper output).
- Raise WebP `quality` from 78 → 86.
- Bump the small variant width from 480 → 640 so it has more pixels for the front-facing card after perspective scaling.
- Keep lg at 960 (still useful for retina front cards).
- Add a sharpening pass (`.sharpen()`) before encoding — screenshots benefit noticeably.

### 2. Prefer the larger variant in `circular-gallery.tsx`

Update the `<picture>` so the browser is biased toward the lg asset on any non-tiny viewport. Two small edits inside `GalleryCard`:

- Change `sizes` to roughly match real on-screen size including perspective zoom, e.g. `(max-width: 768px) 320px, 480px`. With srcset `640w` + `960w`, retina desktops will now pick the 960w lg variant; standard-DPI desktops pick 640w sm.
- Update the srcset descriptors in `portfolioVariants()` to `640w` / `960w` to match the new sm width.

No changes to layout, animation, dominant-colour extraction, preloader, or `pickWarmupUrl` logic (still grabs the sm webp — that stays cheap for colour sampling).

### 3. Run the regen + verify

- Run `node scripts/convert-portfolio.mjs` to rebuild all `*-sm.*` and `*-lg.*` files in `public/portfolio/`.
- Reload the preview and confirm cards look crisp; spot-check file sizes in the script's summary output to make sure we haven't blown up payload (expected: sm grows ~30–50%, still well under originals).

## Out of scope

- Not touching the gallery's animation, glow, or rotation logic.
- Not changing which images are in the carousel or their data in `services.ts`.
- Not adding a third (md) breakpoint — two variants are enough once quality + sm width are raised.
