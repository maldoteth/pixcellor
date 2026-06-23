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
    const onPointerLeave = () => {
      mousePos.current = { x: -9999, y: -9999 };
    };

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);

    let raf = 0;
    const render = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = dotColor;
      const f = frameRef.current;
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
          ctx.beginPath();
          ctx.arc(px, py, size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      frameRef.current++;
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [dotColor, dotSize]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
