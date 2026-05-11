import { useEffect, useState } from "react";

/**
 * Returns true once the hero intro animation has reached the "circle" phase
 * (or immediately if it already has). Used to delay the entry of the top
 * floating buttons so they fade/blur in at the same time as the hero's
 * bottom CTA buttons.
 */
export function useHeroReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If the hero already fired before this listener mounted, the next
    // event will catch us up; also fall back to a safety timeout that
    // matches the 2500ms circle-phase timer in scroll-morph-hero.
    const handler = () => setReady(true);
    window.addEventListener("pixcellor:hero-circle", handler);
    const fallback = window.setTimeout(() => setReady(true), 2700);
    return () => {
      window.removeEventListener("pixcellor:hero-circle", handler);
      window.clearTimeout(fallback);
    };
  }, []);

  return ready;
}
