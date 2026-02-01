

## Fix Mobile Scroll-Up Speed

The mobile scroll speed fix was only partially applied. While scrolling **down** works with the 5x multiplier, scrolling **up** remains slow. 

### The Problem

After reviewing the code, I found the issue: the **wheel event handler** doesn't have the mobile multiplier applied. On mobile browsers, wheel events can still fire (especially on iOS Safari or devices with trackpad-like interactions), bypassing the touch-based multiplier entirely.

### The Solution

Apply the same mobile scroll multiplier to the **wheel event handler** so both scroll mechanisms are fast in both directions.

---

### What Will Change

**File: `src/components/ui/scroll-morph-hero.tsx`**

Update the wheel event handler (lines 153-159) to include the mobile multiplier:

```text
Current (no multiplier on wheel):
  const newScroll = Math.min(Math.max(scrollRef.current + e.deltaY, 0), MAX_SCROLL);

New (multiplier applied on mobile):
  const isMobile = window.innerWidth < 768;
  const scrollDelta = isMobile ? e.deltaY * 5 : e.deltaY;
  const newScroll = Math.min(Math.max(scrollRef.current + scrollDelta, 0), MAX_SCROLL);
```

This ensures that any scroll input on mobile (whether touch-based or wheel-based) gets the 5x speed boost in both directions.

---

### Technical Details

1. Add mobile detection to the wheel event handler (`window.innerWidth < 768`)
2. Apply the same 5x multiplier to `e.deltaY` on mobile devices
3. This mirrors the existing touch handler logic for consistency

