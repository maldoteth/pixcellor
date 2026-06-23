import { useEffect, useRef } from "react";

interface RecruitmentHeroProps {
  dotColor?: string;
  dotSize?: number;
}

/**
 * Hero scene for the "Recruitment & ATS" service.
 * Container-scoped grid of dots that shrink toward the cursor for an
 * organic, breathing texture. Mirrors the API of the other service
 * heroes (sits inside the banner card, no window listeners).
 */
export default function RecruitmentHero({
  dotColor = "#ffffff",
  dotSize = 20,
}: RecruitmentHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: -9999, y: -9999 });
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const CIRCLE_W = dotSize;
    const ACTUAL_W = CIRCLE_W * 0.72;
    const MIN_W = 0;
    const CIRCLE_DIST = CIRCLE_W / 2;

    let cols = 0;
    let rows = 0;
    let greater = 1;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CIRCLE_DIST) + 1;
      rows = Math.ceil(h / CIRCLE_DIST) + 1;
      greater = Math.max(w, h);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const noise = (x: number, y: number, z: number) => {
      const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
      return n - Math.floor(n);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const rect = container.getBoundingClientRect();
      mousePos.current = {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // Per-cell deterministic hue lookup for the rainbow accents.
    const hslToRgb = (h: number, s: number, l: number) => {
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const hp = (h % 360) / 60;
      const x = c * (1 - Math.abs((hp % 2) - 1));
      let r1 = 0, g1 = 0, b1 = 0;
      if (hp < 1) { r1 = c; g1 = x; }
      else if (hp < 2) { r1 = x; g1 = c; }
      else if (hp < 3) { g1 = c; b1 = x; }
      else if (hp < 4) { g1 = x; b1 = c; }
      else if (hp < 5) { r1 = x; b1 = c; }
      else { r1 = c; b1 = x; }
      const m = l - c / 2;
      return `rgb(${Math.round((r1 + m) * 255)},${Math.round((g1 + m) * 255)},${Math.round((b1 + m) * 255)})`;
    };

    let raf = 0;
    const render = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      const f = frameRef.current;
      const diag = Math.max(1, Math.hypot(w, h));
      for (let ci = 0; ci < cols; ci++) {
        const px = ci * CIRCLE_DIST;
        for (let ri = 0; ri < rows; ri++) {
          const py = ri * CIRCLE_DIST;
          const dx = mousePos.current.x - px;
          const dy = mousePos.current.y - py;
          let delta = Math.sqrt(dx * dx + dy * dy);
          const noiseMap = 0.7 + noise(px, py, f) * 0.5;
          delta *= noiseMap;
          if (delta > greater / 2) delta = greater / 2;
          const size = ACTUAL_W - (delta / (greater / 2)) * (ACTUAL_W - MIN_W);
          if (size <= 0.2) continue;

          // Roughly 1 in 6 cells gets a rainbow hue based on grid position.
          const colorful = noise(ci, ri, 0) < 0.18;
          if (colorful) {
            const hue = ((px + py) / diag) * 720;
            ctx.fillStyle = hslToRgb(hue, 1, 0.6);
          } else {
            ctx.fillStyle = dotColor;
          }
          // Squares, not circles
          ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
      }
      frameRef.current++;
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [dotColor, dotSize]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
