import { useEffect } from "react";

/**
 * Globally tracks mouse movement and writes normalized -1..1 cursor position
 * (relative to the hovered card) into --mouse-x / --mouse-y CSS vars on any
 * element marked with `data-lava-card`. Cards reset to 0 when the cursor
 * leaves them. One listener covers every lava-blob card in the app.
 *
 * Disabled on touch / coarse-pointer devices (mobile) per project rules.
 */
export function useLavaCursor() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let lastCard: HTMLElement | null = null;

    const reset = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.setProperty("--mouse-x", "0");
      el.style.setProperty("--mouse-y", "0");
    };

    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const card = target?.closest("[data-lava-card]") as HTMLElement | null;

      if (card !== lastCard) {
        reset(lastCard);
        lastCard = card;
      }

      if (!card) return;

      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      card.style.setProperty("--mouse-x", x.toString());
      card.style.setProperty("--mouse-y", y.toString());
    };

    const onLeaveWindow = () => {
      reset(lastCard);
      lastCard = null;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeaveWindow);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeaveWindow);
    };
  }, []);
}
