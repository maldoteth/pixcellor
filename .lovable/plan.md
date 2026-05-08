## Goal
Flip horizontal swipe direction in `src/components/ui/scroll-morph-hero.tsx` so:
- Swipe **right** → advances forward
- Swipe **left** → goes back

Vertical swipe behavior stays unchanged.

## Change
In the touchmove handler (~line 301):

- Replace `const deltaX = touchStartX - touchX;` with `const deltaX = touchX - touchStartX;`
- Update the comment on ~line 331 from "swipe left = advance, right = back" to "swipe right = advance, left = back".

The `combinedDelta` logic that picks the larger of `deltaY`/`deltaX` stays the same — only the sign of `deltaX` flips.

## Out of scope
- Flipbook native horizontal swipe (already delegated to the flipbook component)
- Vertical scroll/swipe direction
- Any other components