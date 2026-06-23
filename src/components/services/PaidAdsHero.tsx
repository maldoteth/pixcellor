import { useEffect, useRef } from "react";

class Noise {
  p: Uint8Array;
  seed: number;
  grad3: number[][];
  constructor(seed: number) {
    this.p = new Uint8Array(512);
    this.seed = seed > 0 && seed < 1 ? seed : Math.random();
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
    ];
    this.init(this.seed);
  }
  init(seed: number) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 0; i < 256; i++) {
      const j = Math.floor(seed * (i + 1)) % 256;
      const k = p[i];
      p[i] = p[j];
      p[j] = k;
    }
    for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
  }
  dot(g: number[], x: number, y: number) {
    return g[0] * x + g[1] * y;
  }
  perlin2(x: number, y: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const u = fade(x);
    const v = fade(y);
    const p = this.p;
    const g = this.grad3;
    const n00 = this.dot(g[p[X + p[Y]] % 12], x, y);
    const n01 = this.dot(g[p[X + p[Y + 1]] % 12], x, y - 1);
    const n10 = this.dot(g[p[X + 1 + p[Y]] % 12], x - 1, y);
    const n11 = this.dot(g[p[X + 1 + p[Y + 1]] % 12], x - 1, y - 1);
    const lerp = (a: number, b: number, t: number) => a + t * (b - a);
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
  }
}

const cfg = {
  GRID_X_GAP: 10,
  GRID_Y_GAP: 32,
  GRID_WIDTH_OFFSET: 200,
  GRID_HEIGHT_OFFSET: 30,
  WAVE_TIME_X_FACTOR: 0.0125,
  WAVE_NOISE_X_FACTOR: 0.002,
  WAVE_TIME_Y_FACTOR: 0.005,
  WAVE_NOISE_Y_FACTOR: 0.0015,
  WAVE_NOISE_MAGNITUDE: 12,
  WAVE_AMPLITUDE_X: 32,
  WAVE_AMPLITUDE_Y: 16,
  MOUSE_INFLUENCE_RADIUS: 175,
  MOUSE_FALLOFF_FACTOR: 0.001,
  MOUSE_FORCE_FACTOR: 0.00065,
  MOUSE_SMOOTHING_FACTOR: 0.1,
  MAX_MOUSE_VELOCITY: 100,
  TENSION_STRENGTH: 0.005,
  FRICTION: 0.925,
  CURSOR_DISPLACEMENT_STRENGTH: 2,
  MAX_CURSOR_DISPLACEMENT: 100,
};

type Pt = {
  x: number;
  y: number;
  wave: { x: number; y: number };
  cursor: { x: number; y: number; vx: number; vy: number };
};

/**
 * Hero scene for the "Paid ads & retargeting" service.
 * Perlin-noise wave grid drawn on a canvas; lines push and pull
 * around the cursor. Container-scoped to the banner card, with
 * cursor tracking from anywhere on the page.
 */
export default function PaidAdsHero({
  lineColor = "#ffffff",
}: {
  lineColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const noise = new Noise(Math.random());
    let bounding = container.getBoundingClientRect();
    let lines: Pt[][] = [];
    const mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const setSize = () => {
      bounding = container.getBoundingClientRect();
      canvas.width = Math.floor(bounding.width * dpr);
      canvas.height = Math.floor(bounding.height * dpr);
      canvas.style.width = `${bounding.width}px`;
      canvas.style.height = `${bounding.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const setLines = () => {
      const { width, height } = bounding;
      lines = [];
      const oWidth = width + cfg.GRID_WIDTH_OFFSET;
      const oHeight = height + cfg.GRID_HEIGHT_OFFSET;
      const totalLines = Math.ceil(oWidth / cfg.GRID_X_GAP);
      const totalPoints = Math.ceil(oHeight / cfg.GRID_Y_GAP);
      const xStart = (width - cfg.GRID_X_GAP * totalLines) / 2;
      const yStart = (height - cfg.GRID_Y_GAP * totalPoints) / 2;
      for (let i = 0; i <= totalLines; i++) {
        const points: Pt[] = [];
        for (let j = 0; j <= totalPoints; j++) {
          points.push({
            x: xStart + cfg.GRID_X_GAP * i,
            y: yStart + cfg.GRID_Y_GAP * j,
            wave: { x: 0, y: 0 },
            cursor: { x: 0, y: 0, vx: 0, vy: 0 },
          });
        }
        lines.push(points);
      }
    };

    const moved = (p: Pt, withCursor: boolean) => {
      const x = p.x + p.wave.x + (withCursor ? p.cursor.x : 0);
      const y = p.y + p.wave.y + (withCursor ? p.cursor.y : 0);
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    };

    const movePoints = (time: number) => {
      lines.forEach((points) => {
        points.forEach((p) => {
          const noiseInputX = (p.x + time * cfg.WAVE_TIME_X_FACTOR) * cfg.WAVE_NOISE_X_FACTOR;
          const noiseInputY = (p.y + time * cfg.WAVE_TIME_Y_FACTOR) * cfg.WAVE_NOISE_Y_FACTOR;
          const move = noise.perlin2(noiseInputX, noiseInputY) * cfg.WAVE_NOISE_MAGNITUDE;
          p.wave.x = Math.cos(move) * cfg.WAVE_AMPLITUDE_X;
          p.wave.y = Math.sin(move) * cfg.WAVE_AMPLITUDE_Y;

          const dx = p.x - mouse.sx;
          const dy = p.y - mouse.sy;
          const d = Math.hypot(dx, dy);
          const influenceRadius = Math.max(cfg.MOUSE_INFLUENCE_RADIUS, mouse.vs);
          if (d < influenceRadius) {
            const falloff = 1 - d / influenceRadius;
            const force = Math.cos(d * cfg.MOUSE_FALLOFF_FACTOR) * falloff;
            const f = force * influenceRadius * mouse.vs * cfg.MOUSE_FORCE_FACTOR;
            p.cursor.vx += Math.cos(mouse.a) * f;
            p.cursor.vy += Math.sin(mouse.a) * f;
          }

          p.cursor.vx += (0 - p.cursor.x) * cfg.TENSION_STRENGTH;
          p.cursor.vy += (0 - p.cursor.y) * cfg.TENSION_STRENGTH;
          p.cursor.vx *= cfg.FRICTION;
          p.cursor.vy *= cfg.FRICTION;
          p.cursor.x += p.cursor.vx * cfg.CURSOR_DISPLACEMENT_STRENGTH;
          p.cursor.y += p.cursor.vy * cfg.CURSOR_DISPLACEMENT_STRENGTH;
          p.cursor.x = Math.min(cfg.MAX_CURSOR_DISPLACEMENT, Math.max(-cfg.MAX_CURSOR_DISPLACEMENT, p.cursor.x));
          p.cursor.y = Math.min(cfg.MAX_CURSOR_DISPLACEMENT, Math.max(-cfg.MAX_CURSOR_DISPLACEMENT, p.cursor.y));
        });
      });
    };

    const drawLines = () => {
      ctx.clearRect(0, 0, bounding.width, bounding.height);
      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 0.5;
      lines.forEach((points) => {
        const p1 = moved(points[0], false);
        ctx.moveTo(p1.x, p1.y);
        for (let i = 0; i < points.length - 1; i++) {
          const c = moved(points[i], true);
          const n = moved(points[i + 1], true);
          const xc = (c.x + n.x) / 2;
          const yc = (c.y + n.y) / 2;
          ctx.quadraticCurveTo(c.x, c.y, xc, yc);
        }
      });
      ctx.stroke();
    };

    let raf = 0;
    const tick = (time: number) => {
      mouse.sx += (mouse.x - mouse.sx) * cfg.MOUSE_SMOOTHING_FACTOR;
      mouse.sy += (mouse.y - mouse.sy) * cfg.MOUSE_SMOOTHING_FACTOR;
      const dx = mouse.sx - mouse.lx;
      const dy = mouse.sy - mouse.ly;
      const d = Math.hypot(dx, dy);
      mouse.v = d;
      mouse.vs += (d - mouse.vs) * cfg.MOUSE_SMOOTHING_FACTOR;
      mouse.vs = Math.min(cfg.MAX_MOUSE_VELOCITY, mouse.vs);
      mouse.a = Math.atan2(dy, dx);
      mouse.lx = mouse.sx;
      mouse.ly = mouse.sy;

      movePoints(time);
      drawLines();
      raf = requestAnimationFrame(tick);
    };

    const updateMouse = (clientX: number, clientY: number) => {
      mouse.x = clientX - bounding.left;
      mouse.y = clientY - bounding.top;
      if (!mouse.set) {
        mouse.sx = mouse.x;
        mouse.sy = mouse.y;
        mouse.lx = mouse.x;
        mouse.ly = mouse.y;
        mouse.set = true;
      }
    };

    const onMouse = (e: MouseEvent) => updateMouse(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    };

    setSize();
    setLines();
    const ro = new ResizeObserver(() => {
      setSize();
      setLines();
    });
    ro.observe(container);

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, [lineColor]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
