import { useEffect, useRef } from "react";

interface GtmLeadGenHeroProps {
  dotDistance?: number;
  dotRadius?: number;
  minProximity?: number;
}

/**
 * Hero scene for the "GTM & lead generation" service.
 * Container-scoped dot grid that lights up around the cursor with
 * lines drawn from nearby dots to the pointer (hue shifts with
 * position). Cursor is tracked anywhere on the page.
 */
export default function GtmLeadGenHero({
  dotDistance = 30,
  dotRadius = 2,
  minProximity = 200,
}: GtmLeadGenHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, hue: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let dots: { x: number; y: number }[] = [];

    const minProxSq = minProximity * minProximity;

    const buildDots = () => {
      dots = [];
      for (let x = 0; x < w; x += dotDistance) {
        for (let y = 0; y < h; y += dotDistance) {
          dots.push({ x, y });
        }
      }
    };

    const resize = () => {
      w = container.clientWidth || 1;
      h = container.clientHeight || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const onMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const hue = ((x / Math.max(1, rect.width) + y / Math.max(1, rect.height)) * 360) % 360;
      mouseRef.current = { x, y, hue };
    };
    const onMouse = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });

    let raf = 0;
    const render = () => {
      ctx.clearRect(0, 0, w, h);
      const { x: mx, y: my, hue } = mouseRef.current;

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const dx = d.x - mx;
        const dy = d.y - my;
        const distSq = dx * dx + dy * dy;
        if (distSq <= minProxSq) {
          const brightness = 50 - (distSq / minProxSq) * 40;
          const color = `hsl(${hue}, 80%, ${brightness}%)`;
          ctx.fillStyle = color;
          ctx.strokeStyle = color;
          ctx.fillRect(d.x - dotRadius, d.y - dotRadius, dotRadius * 2, dotRadius * 2);
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(mx, my);
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(120, 120, 120, 0.35)";
          ctx.fillRect(d.x - dotRadius, d.y - dotRadius, dotRadius * 2, dotRadius * 2);
        }
      }
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, [dotDistance, dotRadius, minProximity]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
