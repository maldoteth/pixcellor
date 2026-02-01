

## Fix Mobile Scrolling Speed

The site uses a virtual scroll system for the hero animation that requires scrolling through 3000 "virtual pixels" to complete the animation. On mobile, each swipe only moves by the actual pixel distance of your finger movement (1:1 ratio), making it painfully slow.

### The Solution

Add a **mobile scroll multiplier** that amplifies each swipe gesture, so one swipe covers more virtual scroll distance. This gives mobile users a faster, more natural scrolling experience while keeping desktop behavior the same.

---

### What Will Change

**File: `src/components/ui/scroll-morph-hero.tsx`**

In the touch handling logic (around lines 165-173), I'll add a multiplier that increases the scroll speed on mobile:

```text
Current behavior:
  - Each swipe moves scroll by deltaY pixels (1:1)
  - 3000px total ÷ ~100px per swipe = ~30 swipes needed

New behavior:
  - On mobile (< 768px width): multiply deltaY by 4-5x
  - 3000px total ÷ ~400-500px per swipe = ~6-8 swipes needed
```

The multiplier will be applied conditionally based on screen width, so desktop/iPad users with mouse wheels or trackpads keep their current smooth experience.

---

### Technical Details

1. Detect if the device is mobile using `window.innerWidth < 768`
2. Apply a multiplier (approximately 4x) to the touch move delta on mobile only
3. The wheel event (desktop) remains unchanged

