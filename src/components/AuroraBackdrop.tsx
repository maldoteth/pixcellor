import { useEffect, useRef } from "react";

/**
 * Dark animated aurora backdrop.
 * - Near-black base with 3 large blurred radial blobs.
 * - Blobs gently lerp toward pointer position (desktop) and drift on mobile.
 * - Respects prefers-reduced-motion (static gradient).
 *
 * Sits absolutely inside its parent (parent must be `position: relative`).
 */
const AuroraBackdrop = ({ className = "" }: { className?: string }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let mx = 0.5;
    let my = 0.5;
    let tx = 0.5;
    let ty = 0.5;
    let raf = 0;
    let t = 0;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      tx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      ty = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    };

    const tick = () => {
      // Ease toward pointer
      mx += (tx - mx) * 0.06;
      my += (ty - my) * 0.06;
      // Gentle ambient drift so it's never fully still (and animates on mobile w/o pointer)
      t += 0.004;
      const dx = Math.sin(t) * 0.08;
      const dy = Math.cos(t * 0.8) * 0.08;
      el.style.setProperty("--mx", `${((mx + dx) * 100).toFixed(2)}%`);
      el.style.setProperty("--my", `${((my + dy) * 100).toFixed(2)}%`);
      el.style.setProperty("--nx", `${((1 - mx + dy) * 100).toFixed(2)}%`);
      el.style.setProperty("--ny", `${((1 - my + dx) * 100).toFixed(2)}%`);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
      style={{
        // Base near-black with subtle dark gradient
        background:
          "radial-gradient(120% 90% at 50% 0%, #0b0f1a 0%, #05070d 55%, #000 100%)",
        // CSS vars used by ::before / ::after below
        ["--mx" as string]: "50%",
        ["--my" as string]: "50%",
        ["--nx" as string]: "50%",
        ["--ny" as string]: "50%",
      }}
    >
      {/* Aurora blob 1 — indigo */}
      <div
        className="absolute inset-0 transition-[background] duration-300"
        style={{
          background:
            "radial-gradient(40% 35% at var(--mx) var(--my), rgba(99,102,241,0.55) 0%, rgba(99,102,241,0) 70%)",
          filter: "blur(40px)",
        }}
      />
      {/* Aurora blob 2 — cyan/teal */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 40% at var(--nx) var(--ny), rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%)",
          filter: "blur(50px)",
        }}
      />
      {/* Aurora blob 3 — magenta accent, anchored top-right with subtle parallax */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(35% 30% at calc(100% - var(--mx) * 0.6) calc(var(--my) * 0.4), rgba(217,70,239,0.28) 0%, rgba(217,70,239,0) 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Vignette on top for legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
};

export default AuroraBackdrop;
