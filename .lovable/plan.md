## Problem
On `/preview/:slug` (VisionPreview page) the page can be swiped/scrolled horizontally, revealing empty space on the sides. The content is centered in `max-w-5xl` with `px-4`, so nothing should extend beyond the viewport — something inside is causing horizontal overflow (likely the image scroll container with `overflow-auto`, or a wide child like the brief `<pre>` / BrandKit on narrow widths).

## Fix
Edit `src/pages/VisionPreview.tsx`:

1. Add `overflow-x-hidden` (and `w-full`) to the root wrapper `<div className="min-h-screen bg-background text-foreground">` so the page itself can never scroll sideways.
2. Change the image viewer container (line 274) from `overflow-auto` to `overflow-y-auto overflow-x-hidden` — vertical scroll is intentional for tall site mockups, horizontal is not needed since the `<img>` uses `w-full`.
3. Ensure the design-brief `<pre>` (line 307) wraps long tokens by adding `break-words` (it already has `whitespace-pre-wrap`, but very long unbroken strings/URLs in the brief can still push width).

No business logic changes; purely layout/overflow containment.