import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Ethereal gold-dust scene for the "Animated Sites" hero with a
 * cursor-following gold + silver swirl at its centre.
 * Desktop: pointer driven. Mobile: ambient auto-drift.
 */
export default function AnimatedSitesHero() {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement | null>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 70, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 70, damping: 18, mass: 0.6 });

  // Layer parallax
  const orbX = useTransform(sx, [-1, 1], ["-22%", "22%"]);
  const orbY = useTransform(sy, [-1, 1], ["-22%", "22%"]);
  const nebA_X = useTransform(sx, [-1, 1], ["10%", "-10%"]);
  const nebA_Y = useTransform(sy, [-1, 1], ["8%", "-8%"]);
  const nebB_X = useTransform(sx, [-1, 1], ["-14%", "14%"]);
  const nebB_Y = useTransform(sy, [-1, 1], ["-12%", "12%"]);
  const dustX = useTransform(sx, [-1, 1], [-18, 18]);
  const dustY = useTransform(sy, [-1, 1], [-18, 18]);

  // Swirl follows cursor strongly + tilts
  const swirlX = useTransform(sx, [-1, 1], ["-28%", "28%"]);
  const swirlY = useTransform(sy, [-1, 1], ["-22%", "22%"]);
  const swirlRotX = useTransform(sy, [-1, 1], [18, -18]);
  const swirlRotY = useTransform(sx, [-1, 1], [-22, 22]);

  useEffect(() => {
    if (isMobile) {
      let raf = 0;
      const start = performance.now();
      const tick = (t: number) => {
        const e = (t - start) / 1000;
        px.set(Math.sin(e * 0.5) * 0.75);
        py.set(Math.cos(e * 0.37) * 0.6);
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

  const particles = useMemo(
    () =>
      Array.from({ length: 90 }).map((_, i) => {
        const rnd = (seed: number) => {
          const x = Math.sin(seed * 999.137) * 43758.5453;
          return x - Math.floor(x);
        };
        const silver = rnd(i + 200) > 0.65;
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
          silver,
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
        perspective: 1000,
      }}
    >
      {/* Soft gold + silver nebulas */}
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
            "radial-gradient(circle, rgba(220,220,230,0.18) 0%, rgba(138,106,31,0.10) 45%, transparent 70%)",
        }}
      />

      {/* Cursor-following warm light */}
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

      {/* CENTRAL GOLD + SILVER SWIRL — follows cursor */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 flex h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{
          x: swirlX,
          y: swirlY,
          rotateX: swirlRotX,
          rotateY: swirlRotY,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Gold swirl — slow CW */}
        <motion.svg
          viewBox="-100 -100 200 200"
          className="absolute inset-0 h-full w-full"
          style={{ filter: "drop-shadow(0 0 18px rgba(212,175,55,0.55))" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        >
            <defs>
              <linearGradient id="goldStroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f5e6a8" />
                <stop offset="45%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#8a6a1f" />
              </linearGradient>
              <radialGradient id="goldCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,232,160,0.9)" />
                <stop offset="60%" stopColor="rgba(212,175,55,0.25)" />
                <stop offset="100%" stopColor="rgba(212,175,55,0)" />
              </radialGradient>
            </defs>
            <circle cx="0" cy="0" r="55" fill="url(#goldCore)" />
            {/* Spiral path approximated via cubic curves */}
            <path
              d="M0,0 C10,-20 30,-30 50,-20 C70,-10 80,15 65,40 C50,65 15,70 -15,55 C-45,40 -55,5 -40,-25 C-25,-55 15,-65 45,-50"
              fill="none"
              stroke="url(#goldStroke)"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.95"
            />
            <path
              d="M0,0 C-8,-16 -25,-22 -42,-14 C-60,-6 -68,15 -55,38"
              fill="none"
              stroke="url(#goldStroke)"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.75"
            />
          </motion.svg>

          {/* Silver swirl — slower CCW, slightly offset for intertwining */}
          <motion.svg
            viewBox="-100 -100 200 200"
            className="absolute inset-0 h-full w-full"
            style={{ filter: "drop-shadow(0 0 14px rgba(220,225,240,0.45))" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
          >
            <defs>
              <linearGradient id="silverStroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#d8dde6" />
                <stop offset="100%" stopColor="#6b7280" />
              </linearGradient>
            </defs>
            <path
              d="M0,0 C-12,18 -32,28 -52,18 C-72,8 -80,-18 -62,-42 C-44,-66 -10,-70 20,-55 C50,-40 60,-5 45,25 C30,55 -10,65 -40,50"
              fill="none"
              stroke="url(#silverStroke)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d="M0,0 C9,15 26,21 43,13 C61,5 69,-15 56,-38"
              fill="none"
              stroke="url(#silverStroke)"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity="0.7"
            />
            {/* Tiny silver bead at centre */}
            <circle cx="0" cy="0" r="3" fill="#ffffff" opacity="0.9" />
        </motion.svg>

        {/* Pulsing core glow */}
        <motion.div
          className="absolute h-[25%] w-[25%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,232,160,0.7) 0%, rgba(212,175,55,0.25) 50%, transparent 80%)",
            filter: "blur(10px)",
          }}
          animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Gold + silver dust particles (parallax) */}
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
              background: p.silver
                ? "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(210,215,225,0.7) 50%, transparent 100%)"
                : "radial-gradient(circle, rgba(255,232,160,1) 0%, rgba(212,175,55,0.7) 50%, transparent 100%)",
              boxShadow: p.silver
                ? "0 0 6px rgba(230,235,245,0.8), 0 0 12px rgba(180,185,200,0.4)"
                : "0 0 6px rgba(245,215,120,0.85), 0 0 14px rgba(212,175,55,0.45)",
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
