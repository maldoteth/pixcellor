import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Hero scene for the "Landing Pages" service.
 * Same structure as AnimatedSitesHero (cursor-follow nebulas + particles + 3D
 * centrepiece) but with the gold/silver beam replaced by a multi-colour grid
 * of pixel squares — matching the home-page Boxes palette.
 */
const PIXEL_COLORS = [
  "rgb(125 211 252)", // sky
  "rgb(249 168 212)", // pink
  "rgb(134 239 172)", // green
  "rgb(253 224 71)",  // yellow
  "rgb(252 165 165)", // red
  "rgb(216 180 254)", // purple
  "rgb(147 197 253)", // blue
  "rgb(165 180 252)", // indigo
  "rgb(196 181 253)", // violet
];

const GRID_COLS = 9;
const GRID_ROWS = 9;

export default function LandingPagesHero() {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement | null>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 70, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 70, damping: 18, mass: 0.6 });

  const nebA_X = useTransform(sx, [-1, 1], ["10%", "-10%"]);
  const nebA_Y = useTransform(sy, [-1, 1], ["8%", "-8%"]);
  const nebB_X = useTransform(sx, [-1, 1], ["-14%", "14%"]);
  const nebB_Y = useTransform(sy, [-1, 1], ["-12%", "12%"]);
  const dustX = useTransform(sx, [-1, 1], [-18, 18]);
  const dustY = useTransform(sy, [-1, 1], [-18, 18]);

  const swirlX = useTransform(sx, [-1, 1], ["-22%", "22%"]);
  const swirlY = useTransform(sy, [-1, 1], ["-18%", "18%"]);
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

  const rnd = (seed: number) => {
    const x = Math.sin(seed * 999.137) * 43758.5453;
    return x - Math.floor(x);
  };

  const pixels = useMemo(() => {
    const cells: {
      id: number;
      row: number;
      col: number;
      color: string;
      altColor: string;
      delay: number;
      dur: number;
      baseOpacity: number;
    }[] = [];
    let id = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const s = id + 1;
        const color = PIXEL_COLORS[Math.floor(rnd(s + 7) * PIXEL_COLORS.length)];
        const altColor = PIXEL_COLORS[Math.floor(rnd(s + 71) * PIXEL_COLORS.length)];
        cells.push({
          id,
          row: r,
          col: c,
          color,
          altColor,
          delay: rnd(s + 31) * 3,
          dur: 2.5 + rnd(s + 53) * 3.5,
          baseOpacity: 0.55 + rnd(s + 97) * 0.45,
        });
        id++;
      }
    }
    return cells;
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: 90 }).map((_, i) => {
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
          color: PIXEL_COLORS[Math.floor(rnd(i + 200) * PIXEL_COLORS.length)],
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
          "radial-gradient(ellipse at 50% 55%, #0e0a1a 0%, #06060a 55%, #000 100%)",
        perspective: 1000,
      }}
    >
      {/* Soft multi-colour nebulas */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-[10%] top-[10%] h-[70%] w-[70%] rounded-full blur-3xl"
        style={{
          x: nebA_X,
          y: nebA_Y,
          background:
            "radial-gradient(circle, rgba(147,197,253,0.28) 0%, rgba(216,180,254,0.10) 40%, transparent 70%)",
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] bottom-[5%] h-[65%] w-[65%] rounded-full blur-3xl"
        style={{
          x: nebB_X,
          y: nebB_Y,
          background:
            "radial-gradient(circle, rgba(249,168,212,0.22) 0%, rgba(134,239,172,0.10) 45%, transparent 70%)",
        }}
      />

      {/* CENTRAL PIXEL GRID — follows cursor with 3D tilt */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          x: swirlX,
          y: swirlY,
          rotateX: swirlRotX,
          rotateY: swirlRotY,
          transformStyle: "preserve-3d",
        }}
      >
        <motion.div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, 22px)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 22px)`,
            gap: 6,
            transform: "rotate(45deg)",
            filter: "drop-shadow(0 0 18px rgba(180,160,255,0.35))",
          }}
          animate={{ rotate: [45, 47, 45, 43, 45] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        >
          {pixels.map((p) => (
            <motion.span
              key={p.id}
              className="block rounded-[3px]"
              style={{ background: p.color }}
              animate={{
                background: [p.color, p.altColor, p.color],
                opacity: [p.baseOpacity * 0.4, p.baseOpacity, p.baseOpacity * 0.4],
                scale: [0.85, 1, 0.85],
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
      </motion.div>

      {/* Multi-colour dust particles (parallax) */}
      <motion.div
        className="absolute inset-0"
        style={{ x: dustX, y: dustY }}
      >
        {particles.map((p) => (
          <motion.span
            key={p.id}
            aria-hidden
            className="absolute rounded-[2px]"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size + 1,
              height: p.size + 1,
              background: p.color,
              boxShadow: `0 0 6px ${p.color}, 0 0 14px ${p.color}`,
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
