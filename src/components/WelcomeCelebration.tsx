import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type Props = {
  show: boolean;
  isFirstJoin: boolean;
  onDone?: () => void;
  durationMs?: number;
};

const HUES = [0, 30, 50, 120, 180, 210, 280, 320];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
  trail: { x: number; y: number }[];
  kind: "rocket" | "spark";
  explodeAt?: number;
};

export default function WelcomeCelebration({ show, isFirstJoin, onDone, durationMs = 5200 }: Props) {
  const [visible, setVisible] = useState(show);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const close = () => {
    setVisible(false);
    onDone?.();
  };

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = window.setTimeout(close, durationMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, durationMs]);

  // Canvas fireworks
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    const GRAVITY = 0.08;

    const launchRocket = () => {
      const x = W() * (0.15 + Math.random() * 0.7);
      const targetY = H() * (0.18 + Math.random() * 0.32);
      const startY = H() + 10;
      const flightFrames = 55 + Math.random() * 25;
      const vy = -(startY - targetY) / flightFrames - 0.5 * GRAVITY * flightFrames;
      particles.push({
        x,
        y: startY,
        vx: (Math.random() - 0.5) * 0.6,
        vy,
        life: 0,
        maxLife: flightFrames,
        hue: HUES[Math.floor(Math.random() * HUES.length)],
        size: 2.2,
        trail: [],
        kind: "rocket",
      });
    };

    const explode = (p: Particle) => {
      const count = 70 + Math.floor(Math.random() * 40);
      const baseHue = p.hue;
      const power = 3 + Math.random() * 2;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.1;
        const speed = power * (0.5 + Math.random() * 0.9);
        particles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 70 + Math.random() * 40,
          hue: baseHue + (Math.random() - 0.5) * 25,
          size: 1.8 + Math.random() * 1.2,
          trail: [],
          kind: "spark",
        });
      }
    };

    let frame = 0;
    let lastLaunch = 0;
    const start = performance.now();

    const tick = () => {
      // Trail-fade background
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(0, 0, W(), H());

      ctx.globalCompositeOperation = "lighter";

      // Launch on cadence — quick burst at the start, sustained after
      const elapsed = performance.now() - start;
      const cadence = elapsed < 1200 ? 6 : elapsed < 3500 ? 14 : 22;
      if (frame - lastLaunch > cadence) {
        launchRocket();
        if (elapsed < 800 && Math.random() < 0.7) launchRocket();
        lastLaunch = frame;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        // Trail history
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > (p.kind === "rocket" ? 10 : 6)) p.trail.shift();

        p.vy += GRAVITY * (p.kind === "spark" ? 1 : 1);
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.kind === "spark") p.vx *= 0.985;

        // Draw trail
        for (let t = 0; t < p.trail.length; t++) {
          const tp = p.trail[t];
          const alpha = (t / p.trail.length) * (1 - p.life / p.maxLife);
          if (alpha <= 0) continue;
          ctx.beginPath();
          ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${alpha * 0.55})`;
          ctx.arc(tp.x, tp.y, p.size * (t / p.trail.length) * 0.9, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw head with glow
        const lifeRatio = 1 - p.life / p.maxLife;
        ctx.beginPath();
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grd.addColorStop(0, `hsla(${p.hue}, 100%, 80%, ${lifeRatio})`);
        grd.addColorStop(0.4, `hsla(${p.hue}, 100%, 60%, ${lifeRatio * 0.7})`);
        grd.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
        ctx.fillStyle = grd;
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 100%, 85%, ${lifeRatio})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Rocket reached apex (vy turned positive) — explode
        if (p.kind === "rocket" && p.vy >= -0.2) {
          explode(p);
          particles.splice(i, 1);
          continue;
        }

        if (p.life >= p.maxLife || p.y > H() + 20) {
          particles.splice(i, 1);
        }
      }

      frame++;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden"
          aria-hidden="true"
        >
          {/* Backdrop */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-black/55 via-black/30 to-black/60" />

          {/* Canvas fireworks */}
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          {/* Close button */}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-5 right-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="pointer-events-none relative px-8 py-6 text-center"
          >
            <div className="rounded-2xl border border-white/15 bg-white/[0.06] px-8 py-6 backdrop-blur-xl shadow-[0_10px_60px_rgba(0,0,0,0.5)]">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="text-xs uppercase tracking-[0.35em] text-white/60"
              >
                {isFirstJoin ? "You're in" : "Good to see you"}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.6 }}
                className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-white"
              >
                {isFirstJoin ? (
                  <>Welcome to <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">Pixcellor</span></>
                ) : (
                  <>Welcome back</>
                )}
              </motion.h2>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
