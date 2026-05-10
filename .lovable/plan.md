## Goal
Replace the silent 5-second auto-flip on the Retainer/Enterprise pricing card with a visible "snake" countdown that travels around the edge of the small toggle button (top-right of the card). When the snake completes one lap, the card flips. The same animation runs on the back face for the return flip 5 seconds later.

## What changes

**File: `src/components/PackagesDialog.tsx`** (desktop shell ~lines 645-940 and mobile shell ~lines 1170-1370)

1. **Remove the blind `setInterval` flip** (lines 651-655 and 1177-1181). The flip will now be triggered by the animation finishing, not by a timer firing in the background.

2. **Build a new `SnakeFlipButton` component** used in place of the four existing toggle Buttons (lines 856, 938, 1293, 1364). It renders:
   - The label ("Enterprise" on the front, "Retainer" on the back).
   - A border-following light that wraps around the button edge over 5 seconds (top → right → bottom → left → back to start), styled like the classic Snake game tail.
   - When the lap completes, it calls the flip handler. Then the new visible face's button starts its own 5-second lap, and so on.
   - Pauses (and visually freezes) when `enterpriseOpen`, `servicesFlipped`, or after the user clicks it manually (existing `retainerAutoFlipStopped` flag).
   - Click still flips immediately and stops the auto-cycle, matching today's behaviour.

3. **Visual technique for the snake border**
   - Use a single thin line (~2px) that travels the perimeter using a CSS conic-gradient mask or an SVG `<rect>` with `stroke-dasharray` + animated `stroke-dashoffset`. SVG is cleaner for "snake wrapping the edge" and matches the curved/sharp button corners precisely.
   - Color: white/primary accent (matches the fully-black minimal theme, white accents).
   - Length of the snake segment: roughly 25-30% of the perimeter so it visibly travels rather than fills.
   - Duration: 5000ms linear, then triggers the flip and restarts on the opposite face.
   - Underneath, a faint perimeter track (very low opacity) so users see the path the snake follows.

4. **Timer text**
   - Inside the button, next to the label, show a tiny live countdown (e.g. `Enterprise · 4s`) that ticks 5 → 1 each cycle so the user also gets a numeric read of when it will spin. Updates once per second via a small interval tied to the same lifecycle.

## Behaviour summary
- Card visible: front (Retainer). Top-right button reads `Enterprise · 5s` with an empty border. Snake light starts at the top-left corner and crawls clockwise around the button edge.
- After 5s the snake completes its loop → card flips to Enterprise.
- The Enterprise face's top-right button now reads `Retainer · 5s` and its own snake starts crawling.
- After 5s it flips back to Retainer. Loop continues until the user opens the enterprise form, flips services, or clicks the toggle manually — any of which stops the cycle (existing behaviour preserved).

## Notes
- Respect existing memory rule: use Framer Motion (or plain SVG with CSS) for the animation; do not add `hover:scale-*` classes.
- Keep the button sizing (`h-7` desktop, `h-8` mobile) so layout doesn't shift.
- Mobile and desktop shells get identical behaviour via the shared `SnakeFlipButton` component.

No other files are touched.