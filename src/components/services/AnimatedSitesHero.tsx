import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Mouse-reactive hero for the "Animated Sites" service.
 * Replaces the static hero image with a parallax scene:
 *   - Cursor-following gradient orb
 *   - Tilted glass "browser window" stack that responds to pointer
 *   - Animated grid + scanlines + floating sparkles
 * Cursor-following is desktop-only per project rule; mobile gets
 * an ambient auto-animated version of the same scene.
 */
export default function AnimatedSitesHero() {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement | null>(null);

  // Normalised pointer in [-1, 1]
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const sx = useSpring(px, { stiffness: 80, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 80, damping: 18, mass: 0.6 });

  // Parallax / tilt transforms
  const rotateY = useTransform(sx, [-1, 1], [12, -12]);
  const rotateX = useTransform(sy, [-1, 1], [-8, 8]);
  const orbX = useTransform(sx, [-1, 1], ["-15%", "15%"]);
  const orbY = useTransform(sy, [-1, 1], ["-15%", "15%"]);
  const layer1X = useTransform(sx, [-1, 1], [-18, 18]);
  const layer1Y = useTransform(sy, [-1, 1], [-12, 12]);
  const layer2X = useTransform(sx, [-1, 1], [10, -10]);
  const layer2Y = useTransform(sy, [-1, 1], [6, -6]);
  const gridX = useTransform(sx, [-1, 1], [-8, 8]);
  const gridY = useTransform(sy, [-1, 1], [-8, 8]);

  useEffect(() => {
    if (isMobile) {
      // Ambient drift on mobile (no pointer listening)
      let raf = 0;
      const start = performance.now();
      const tick = (t: number) => {
        const e = (t - start) / 1000;
        px.set(Math.sin(e * 0.6) * 0.6);
        py.set(Math.cos(e * 0.5) * 0.5);
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

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,_hsl(0_0%_8%)_0%,_hsl(0_0%_3%)_70%,_#000_100%)]"
      style={{ perspective: 1200 }}
    >
      {/* Animated grid */}
      <motion.div
        aria-hidden
        className="absolute -inset-10 opacity-[0.18]"
        style={{
          x: gridX,
          y: gridY,
          backgroundImage:
            "linear-gradient(hsl(0 0% 100% / 0.12) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.12) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 35%, transparent 75%)",
        }}
      />

      {/* Cursor-following orb */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          x: orbX,
          y: orbY,
          background:
            "radial-gradient(circle, hsl(0 0% 100% / 0.22) 0%, hsl(0 0% 100% / 0.06) 40%, transparent 70%)",
        }}
      />

      {/* Sparkles */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute h-1 w-1 rounded-full bg-foreground/70"
          style={{
            left: `${(i * 73) % 100}%`,
            top: `${(i * 41) % 100}%`,
            boxShadow: "0 0 8px hsl(0 0% 100% / 0.7)",
          }}
          animate={{ opacity: [0.1, 0.9, 0.1], scale: [0.6, 1.2, 0.6] }}
          transition={{
            duration: 3 + (i % 5),
            repeat: Infinity,
            delay: (i % 7) * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Browser window stack with parallax tilt */}
      <motion.div
        className="absolute inset-0 grid place-items-center"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        {/* Back card */}
        <motion.div
          className="absolute h-[55%] w-[60%] rounded-xl border border-foreground/15 bg-background/20 backdrop-blur-md"
          style={{
            x: layer2X,
            y: layer2Y,
            translateZ: -40,
            transform: "translate(-22%, -22%)",
          }}
        />
        {/* Mid card */}
        <motion.div
          className="absolute h-[58%] w-[62%] rounded-xl border border-foreground/15 bg-background/25 backdrop-blur-md"
          style={{
            x: layer1X,
            y: layer1Y,
            translateZ: -20,
            transform: "translate(18%, 18%)",
          }}
        />
        {/* Front browser */}
        <motion.div
          className="relative h-[62%] w-[70%] overflow-hidden rounded-xl border border-foreground/25 bg-background/40 shadow-2xl backdrop-blur-xl"
          style={{ translateZ: 0 }}
        >
          {/* Title bar */}
          <div className="flex items-center gap-1.5 border-b border-foreground/15 bg-foreground/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/30" />
            <div className="ml-3 h-3 flex-1 rounded bg-foreground/10" />
          </div>
          {/* Content shimmer */}
          <div className="relative h-full p-4">
            <motion.div
              className="mb-3 h-4 w-1/2 rounded bg-foreground/20"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
            <motion.div
              className="mb-2 h-2.5 w-3/4 rounded bg-foreground/12"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="mb-5 h-2.5 w-2/3 rounded bg-foreground/12"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: 0.4 }}
            />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="aspect-[4/3] rounded-md border border-foreground/15 bg-foreground/8"
                  animate={{
                    y: [0, -4, 0],
                    backgroundColor: [
                      "hsl(0 0% 100% / 0.06)",
                      "hsl(0 0% 100% / 0.14)",
                      "hsl(0 0% 100% / 0.06)",
                    ],
                  }}
                  transition={{
                    duration: 3 + i * 0.5,
                    repeat: Infinity,
                    delay: i * 0.25,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            {/* Scanline sweep */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(115deg, transparent 30%, hsl(0 0% 100% / 0.12) 50%, transparent 70%)",
              }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Soft vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, hsl(0 0% 0% / 0.55) 100%)",
        }}
      />
    </div>
  );
}
