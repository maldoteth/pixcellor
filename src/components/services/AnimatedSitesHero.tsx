import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Ethereal gold-dust scene for the "Animated Sites" hero.
 * Dark canvas with drifting gold particles, soft nebula orbs and a
 * cursor-following light. Desktop reacts to pointer; mobile gets
 * ambient auto-drift (per project rule: cursor effects desktop-only).
 */
export default function AnimatedSitesHero() {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement | null>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20, mass: 0.7 });
  const sy = useSpring(py, { stiffness: 60, damping: 20, mass: 0.7 });

  const orbX = useTransform(sx, [-1, 1], ["-22%", "22%"]);
  const orbY = useTransform(sy, [-1, 1], ["-22%", "22%"]);
  const nebA_X = useTransform(sx, [-1, 1], ["8%", "-8%"]);
  const nebA_Y = useTransform(sy, [-1, 1], ["6%", "-6%"]);
  const nebB_X = useTransform(sx, [-1, 1], ["-12%", "12%"]);
  const nebB_Y = useTransform(sy, [-1, 1], ["-10%", "10%"]);
  const dustX = useTransform(sx, [-1, 1], [-14, 14]);
  const dustY = useTransform(sy, [-1, 1], [-14, 14]);
  const veilX = useTransform(sx, [-1, 1], [10, -10]);
  const veilY = useTransform(sy, [-1, 1], [8, -8]);

  useEffect(() => {
    if (isMobile) {
      let raf = 0;
      const start = performance.now();
      const tick = (t: number) => {
        const e = (t - start) / 1000;
        px.set(Math.sin(e * 0.45) * 0.7);
        py.set(Math.cos(e * 0.35) * 0.55);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      px.set(Math.max(-1, Math.min(1, nx)));
      py.set(Math.max(-1, Math.min(1, ny)));
    };
    const onLeave = () => {
      px.set(0);
      py.set(0);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [isMobile, px, py]);

  // Pre-computed gold particle field (stable across renders)
  const particles = useMemo(
    () =>
      Array.from({ length: 90 }).map((_, i) => {
        const rnd = (seed: number) => {
          const x = Math.sin(seed * 999.137) * 43758.5453;
          return x - Math.floor(x);
        };
        const size = 1 + rnd(i + 1) * 3.2;
        return {
          id: i,
          left: rnd(i + 11) * 100,
          top: rnd(i + 23) * 100,
          size,
          dur: 4 + rnd(i + 37) * 7,
          delay: rnd(i + 53) * 5,
          drift: 12 + rnd(i + 71) * 28,
          opacity: 0.35 + rnd(i + 91) * 0.55,
        };
      }),
    []
  );

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 55%, #16110a 0%, #0a0805 55%, #000 100%)",
      }}
    >
      {/* Soft gold nebulas */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-[10%] top-[10%] h-[70%] w-[70%] rounded-full blur-3xl"
        style={{
          x: nebA_X,
          y: nebA_Y,
          background:
            "radial-gradient(circle, rgba(212,175,55,0.32) 0%, rgba(212,175,55,0.10) 40%, transparent 70%)",
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] bottom-[5%] h-[65%] w-[65%] rounded-full blur-3xl"
        style={{
          x: nebB_X,
          y: nebB_Y,
          background:
            "radial-gradient(circle, rgba(245,230,168,0.22) 0%, rgba(138,106,31,0.10) 45%, transparent 70%)",
        }}
      />

      {/* Cursor-following gold light */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
        style={{
          x: orbX,
          y: orbY,
          background:
            "radial-gradient(circle, rgba(245,230,168,0.45) 0%, rgba(212,175,55,0.20) 35%, transparent 70%)",
          mixBlendMode: "screen",
        }}
      />

      {/* Ethereal flowing ribbon (slow-rotating conic gold) */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 opacity-[0.18] blur-2xl"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.6) 60deg, transparent 120deg, transparent 240deg, rgba(245,230,168,0.5) 300deg, transparent 360deg)",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />

      {/* Veil shimmer */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          x: veilX,
          y: veilY,
          background:
            "linear-gradient(115deg, transparent 35%, rgba(245,230,168,0.18) 50%, transparent 65%)",
        }}
        animate={{ backgroundPositionX: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Gold dust particles */}
      <motion.div
        className="absolute inset-0"
        style={{ x: dustX, y: dustY }}
      >
        {particles.map((p) => (
          <motion.span
            key={p.id}
            aria-hidden
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              background:
                "radial-gradient(circle, rgba(255,232,160,1) 0%, rgba(212,175,55,0.7) 50%, transparent 100%)",
              boxShadow:
                "0 0 6px rgba(245,215,120,0.85), 0 0 14px rgba(212,175,55,0.45)",
            }}
            animate={{
              y: [0, -p.drift, 0],
              x: [0, p.drift * 0.4, 0],
              opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.3],
              scale: [0.7, 1.15, 0.7],
            }}
            transition={{
              duration: p.dur,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
        }}
      />
    </div>
  );
}
