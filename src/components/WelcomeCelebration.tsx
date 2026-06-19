import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  show: boolean;
  isFirstJoin: boolean;
  onDone?: () => void;
  durationMs?: number;
};

const COLORS = ["#ffffff", "#f5f5f5", "#d4d4d8", "#a1a1aa", "#fbbf24", "#f472b6", "#60a5fa", "#34d399"];

type Burst = {
  id: number;
  x: number;
  y: number;
  delay: number;
  color: string;
  particles: number;
};

function makeBursts(count: number): Burst[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    y: 15 + Math.random() * 55,
    delay: Math.random() * 1.6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    particles: 18,
  }));
}

export default function WelcomeCelebration({ show, isFirstJoin, onDone, durationMs = 3800 }: Props) {
  const [visible, setVisible] = useState(show);
  const bursts = useMemo(() => makeBursts(7), [show]);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [show, durationMs, onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center overflow-hidden"
          aria-hidden="true"
        >
          {/* Soft vignette */}
          <div className="absolute inset-0 bg-gradient-radial from-black/40 via-black/20 to-transparent" />

          {/* Fireworks */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {bursts.map((b) => (
              <g key={b.id} transform={`translate(${b.x} ${b.y})`}>
                {Array.from({ length: b.particles }).map((_, i) => {
                  const angle = (i / b.particles) * Math.PI * 2;
                  const dist = 6 + Math.random() * 4;
                  const dx = Math.cos(angle) * dist;
                  const dy = Math.sin(angle) * dist;
                  return (
                    <motion.circle
                      key={i}
                      cx={0}
                      cy={0}
                      r={0.35}
                      fill={b.color}
                      initial={{ opacity: 0, cx: 0, cy: 0 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        cx: [0, dx],
                        cy: [0, dy + 1.5],
                      }}
                      transition={{
                        delay: b.delay,
                        duration: 1.6,
                        ease: "easeOut",
                        times: [0, 0.05, 0.6, 1],
                      }}
                    />
                  );
                })}
                {/* Core flash */}
                <motion.circle
                  cx={0}
                  cy={0}
                  r={1.2}
                  fill={b.color}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
                  transition={{ delay: b.delay, duration: 0.6, ease: "easeOut" }}
                />
              </g>
            ))}
          </svg>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="relative px-8 py-6 text-center"
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
