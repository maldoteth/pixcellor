import { useEffect, useRef } from "react";

interface Options {
  onCloseDrag?: () => void;
  closeThreshold?: number;
}

export function useDrawerTouchScroll<T extends HTMLElement>(enabled = true, options: Options = {}) {
  const { onCloseDrag, closeThreshold = 80 } = options;
  const scrollRef = useRef<T | null>(null);
  const lastYRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const startScrollTopRef = useRef<number>(0);
  const closeTriggeredRef = useRef<boolean>(false);

  const onCloseDragRef = useRef(onCloseDrag);
  useEffect(() => {
    onCloseDragRef.current = onCloseDrag;
  }, [onCloseDrag]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!enabled || !element) return;

    const handleTouchStart = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? null;
      lastYRef.current = y;
      startYRef.current = y;
      startScrollTopRef.current = element.scrollTop;
      closeTriggeredRef.current = false;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY;
      if (lastYRef.current === null || currentY === undefined) return;

      const maxScroll = element.scrollHeight - element.clientHeight;
      const deltaY = lastYRef.current - currentY;
      lastYRef.current = currentY;

      // Drag-down to close when at top
      if (
        !closeTriggeredRef.current &&
        onCloseDragRef.current &&
        startYRef.current !== null &&
        startScrollTopRef.current <= 0 &&
        element.scrollTop <= 0 &&
        currentY - startYRef.current > closeThreshold
      ) {
        closeTriggeredRef.current = true;
        onCloseDragRef.current();
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (maxScroll > 0) {
        element.scrollTop = Math.max(0, Math.min(maxScroll, element.scrollTop + deltaY));
      }

      event.preventDefault();
      event.stopPropagation();
    };

    const resetTouch = () => {
      lastYRef.current = null;
      startYRef.current = null;
      closeTriggeredRef.current = false;
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
  }, [enabled, closeThreshold]);

  return scrollRef;
}
