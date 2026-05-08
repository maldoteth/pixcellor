## What I found

Each carousel card still carries its company URL — `item.photo.by` is populated from `portfolio_projects.url` in `scroll-morph-hero.tsx` (line 705). Nothing was lost; clicks were just disabled when we fixed the "back-of-ring cards stealing taps" bug.

`circular-gallery.tsx` already computes `isFrontFacing = normalizedAngle < 75` (line 99) but currently forces `pointerEvents: 'none'` on every card.

## Plan

Re-enable clicks, but only on front-facing cards so empty black areas don't trigger anything.

1. In `src/components/ui/circular-gallery.tsx`:
   - On the outer card wrapper, set `pointerEvents: isFrontFacing ? 'auto' : 'none'` (replacing the unconditional `'none'`).
   - On the inner card div, when `isFrontFacing` is true: add `cursor-pointer`, `role="link"`, `tabIndex={0}`, `aria-label={`Open ${item.common}`}`, and an `onClick` / `onKeyDown` (Enter/Space) that calls a small helper:
     ```ts
     const url = item.photo.by;
     const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
     window.open(href, '_blank', 'noopener,noreferrer');
     ```
   - When not front-facing: keep current behaviour (no handlers, `pointer-events: none`, `aria-hidden`).

That's the only file changed. FlipCards, hover-glow, scroll sensitivity, and rotation logic are untouched.

### Verification
- Tap a visible front card → opens its company site in a new tab.
- Tap empty black space to the side → still does nothing (back/side cards remain non-interactive).
- Keyboard tab cycles only through visible front cards.
