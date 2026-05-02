## Problem

On a Samsung S24 (and other modern mobile browsers with a dynamic URL/toolbar), the footer is invisible at the bottom of the page when scrolled to the end of the hero animation.

**Root cause:** The hero container in `src/pages/Index.tsx` uses `h-screen` (CSS `100vh`). On mobile browsers, `100vh` corresponds to the *largest* viewport — i.e. the area that exists when the browser's address bar is hidden. With the address bar visible, the bottom ~60–100px of that container sits *underneath* the browser chrome. The Footer is positioned `absolute bottom-0` inside that container, so it gets pushed off-screen behind the toolbar.

## Fix

Switch the hero container from `h-screen` to `h-dvh` (dynamic viewport height). `100dvh` updates as the browser UI shows/hides, so the footer always sits at the visible bottom of the screen on mobile, and behaves identically to `100vh` on desktop.

### Changes

1. **`src/pages/Index.tsx`** (line 13)
   - Change `className="relative h-screen overflow-hidden"` to `className="relative h-dvh overflow-hidden"`.

2. **`src/components/ui/scroll-morph-hero.tsx`** — sanity check
   - The hero root uses `h-full` and reads `containerSize` via ResizeObserver, so it will pick up the new dynamic height automatically. No changes needed there.

### Why not other approaches

- Adding bottom padding / `safe-area-inset-bottom`: doesn't help because the issue is browser chrome (URL bar), not iOS safe areas.
- `min-h-screen` with scrolling: the page is intentionally a single viewport with virtual scroll; we don't want real page scroll.
- JS-based `--vh` workaround: unnecessary now that `dvh` is well supported in all modern mobile browsers (including Samsung Internet 21+ and Chrome 108+).

## QA

- Verify on the requested mobile viewport that the Footer (Pixcellor wordmark, phone, social icons) is visible at the bottom once the hero animation completes.
- Verify desktop layout is unchanged.
