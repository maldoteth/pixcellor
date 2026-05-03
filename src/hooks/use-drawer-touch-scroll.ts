import { useEffect, useRef } from "react";

export function useDrawerTouchScroll<T extends HTMLElement>(enabled = true) {
  const scrollRef = useRef<T | null>(null);
  const lastYRef = useRef<number | null>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!enabled || !element) return;

    const handleTouchStart = (event: TouchEvent) => {
      lastYRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY;
      if (lastYRef.current === null || currentY === undefined) return;

      const maxScroll = element.scrollHeight - element.clientHeight;
      if (maxScroll <= 0) return;

      const deltaY = lastYRef.current - currentY;
      lastYRef.current = currentY;
      element.scrollTop = Math.max(0, Math.min(maxScroll, element.scrollTop + deltaY));

      event.preventDefault();
      event.stopPropagation();
    };

    const resetTouch = () => {
      lastYRef.current = null;
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: false, capture: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
    element.addEventListener("touchend", resetTouch, { passive: true, capture: true });
    element.addEventListener("touchcancel", resetTouch, { passive: true, capture: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart, { capture: true });
      element.removeEventListener("touchmove", handleTouchMove, { capture: true });
      element.removeEventListener("touchend", resetTouch, { capture: true });
      element.removeEventListener("touchcancel", resetTouch, { capture: true });
    };
  }, [enabled]);

  return scrollRef;
}