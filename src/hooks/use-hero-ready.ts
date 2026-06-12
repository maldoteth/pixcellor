import { useEffect, useState } from "react";

/**
 * Returns true when the hero is in its "circle" phase (intro complete and
 * user hasn't scrolled past it). Used to fade/blur the top floating buttons
 * (AI, Chat, Login) in/out in sync with the hero's bottom CTA buttons.
 */
export function useHeroReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onCircle = () => setReady(true);
    const onVisible = (e: Event) => {
      const detail = (e as CustomEvent<{ visible?: boolean }>).detail;
      if (typeof detail?.visible === "boolean") setReady(detail.visible);
    };
    window.addEventListener("pixcellor:hero-circle", onCircle);
    window.addEventListener("pixcellor:hero-visible", onVisible);
    // Show the top buttons immediately (still fading in via CSS transition)
    // rather than waiting for the hero intro animation to complete.
    const raf = requestAnimationFrame(() => setReady(true));
    return () => {
      window.removeEventListener("pixcellor:hero-circle", onCircle);
      window.removeEventListener("pixcellor:hero-visible", onVisible);
      cancelAnimationFrame(raf);
    };
  }, []);

  return ready;
}
