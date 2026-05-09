## Goal
Stop the **Portfolio / Services / Let's Talk** buttons overlapping the circular hero gallery when a phone is held in landscape. Keep portrait mobile and desktop unchanged.

## Why it overlaps today
In `src/components/ui/scroll-morph-hero.tsx`:

- The CTA wrapper (line ~798) is anchored `bottom-[34px]` on mobile and uses the **stacked** layout (`md:hidden flex flex-col … gap-2`) — three 34px-tall buttons stack to roughly 120px tall.
- The circular gallery (line ~947) is positioned `bottom-[calc(18%+64px)]` on mobile.
- On a typical landscape phone (e.g. 812×375), `18% of 375 + 64 ≈ 131px` from bottom, and the stacked button group extends to ~150px from bottom → overlap.
- The hero title block (`top-[230px]` on mobile) is also off-screen in landscape (only 375px tall), but that's a secondary issue.

Blocking landscape entirely isn't necessary — this is a layout problem with a small, contained fix.

## Fix (frontend only, single file)

Edit `src/components/ui/scroll-morph-hero.tsx`. Use a **landscape-phone breakpoint** defined as "short viewport" (`max-height: 500px`) combined with the existing mobile path. We can express this with arbitrary Tailwind variants like `max-[900px]:landscape:` or, more reliably, `[@media(orientation:landscape)_and_(max-height:500px)]:` utilities.

### 1. CTA buttons — switch to horizontal row in landscape phone
Currently:
```
<div className="md:hidden flex flex-col items-stretch gap-2 w-full"> … 3 buttons … </div>
<div className="hidden md:flex justify-center items-center gap-3"> … 3 buttons … </div>
```
Change the mobile stack to flip horizontal in landscape phone:
- Outer mobile wrapper: add `[@media(orientation:landscape)_and_(max-height:500px)]:flex-row [@media(orientation:landscape)_and_(max-height:500px)]:justify-center [@media(orientation:landscape)_and_(max-height:500px)]:gap-2 [@media(orientation:landscape)_and_(max-height:500px)]:w-auto [@media(orientation:landscape)_and_(max-height:500px)]:px-0`.
- Each button: add `[@media(orientation:landscape)_and_(max-height:500px)]:w-[110px] [@media(orientation:landscape)_and_(max-height:500px)]:h-[32px]` so they sit on one line.
- Outer wrapper position: bump bottom slightly tighter, e.g. `[@media(orientation:landscape)_and_(max-height:500px)]:bottom-[12px]`.

This collapses ~120px of vertical button space to a single ~32px row.

### 2. Gallery — lift clear of the row
Update the gallery wrapper (line ~950):
- Add `[@media(orientation:landscape)_and_(max-height:500px)]:bottom-[64px]` so the bottom of the gallery sits cleanly above the now-horizontal buttons.
- Add `[@media(orientation:landscape)_and_(max-height:500px)]:top-[14%]` to give it a sensible top in a short viewport.

### 3. Hero title block — keep it on-screen
Title block (line ~740) currently `top-[230px]` on mobile. Add `[@media(orientation:landscape)_and_(max-height:500px)]:top-[24px]` and shrink the wordmark in that breakpoint: `[@media(orientation:landscape)_and_(max-height:500px)]:h-[2.4rem]` on the `<img>` (line ~748). Hide the in-circle mobile down-arrow (lines 757–775) in this breakpoint using `[@media(orientation:landscape)_and_(max-height:500px)]:hidden` since vertical space is too tight.

### 4. Optional polish
- Reduce the bottom CTA wrapper's mobile padding (`px-[1.5rem]`) to `px-2` in landscape so the row doesn't get crammed.
- Leave the chat bubble / other floating elements alone — they don't overlap.

## Trade-offs / non-goals
- **Not** adding a "rotate your device" overlay. The fix is small and a forced overlay is heavy-handed.
- No changes to desktop, portrait mobile, or tablet layouts.
- No changes to the gallery's internal radius logic — already responsive enough once the wrapper height changes.

## Verification
- DevTools / preview at **812×375** and **844×390** (landscape iPhone sizes): three CTA buttons appear in one row at the bottom, the circular gallery sits clearly above them with no overlap, and the wordmark is visible at the top.
- Portrait mobile (390×844) and desktop (≥768px): visually identical to current.
- Rotate the preview between portrait and landscape and confirm the layout swaps cleanly without flicker.
