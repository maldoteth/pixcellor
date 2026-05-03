import { useRef } from "react";

export function useDrawerDragClose(onClose: () => void, threshold = 60) {
  const startYRef = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const currentY = e.touches[0]?.clientY;
    if (currentY === undefined) return;
    const delta = currentY - startYRef.current;
    if (delta > threshold) {
      startYRef.current = null;
      onClose();
    }
  };

  const onTouchEnd = () => {
    startYRef.current = null;
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}
