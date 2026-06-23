import { useEffect, useRef } from "react";

interface Props {
  dotColor?: string;
  highlightColor?: string;
  backgroundColor?: string;
  dotSize?: number;
  dotSpacing?: number;
  influenceRadius?: number;
}

/**
 * SEO & AEO hero — dotted square grid that "pops up" near the cursor.
 * Canvas-rendered for performance with smooth interpolated highlights.
 */
const SeoAeoHero: React.FC<Props> = ({
  dotColor = "#215769",
  highlightColor = "#ffffff",
  backgroundColor = "#000000",
  dotSize = 2,
  dotSpacing = 14,
  influenceRadius = 110,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999, active: false };

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onLeave = () => { mouse.active = false; mouse.x = -9999; mouse.y = -9999; };
    const onTouch = (e: TouchEvent) => {
      if (!e.touches.length) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.active = true;
    };
    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    container.addEventListener("touchmove", onTouch, { passive: true });
    container.addEventListener("touchend", onLeave);

    // Parse hex colors once.
    const parseHex = (hex: string) => {
      const h = hex.replace("#", "");
      const v = h.length === 3
        ? h.split("").map((c) => parseInt(c + c, 16))
        : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      return v;
    };
    const baseRGB = parseHex(dotColor);
    const highRGB = parseHex(highlightColor);

    // HSL→RGB helper for the rainbow highlight.
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
      return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
    };

    let raf = 0;
    const render = () => {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      const r2 = influenceRadius * influenceRadius;
      const diag = Math.max(1, Math.hypot(width, height));
      for (let y = dotSpacing / 2; y < height; y += dotSpacing) {
        for (let x = dotSpacing / 2; x < width; x += dotSpacing) {
          let t = 0;
          if (mouse.active) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2) {
              t = 1 - d2 / r2;
              t = t * t;
            }
          }
          // Per-square hue derived from position → full spectrum across the grid.
          const hue = ((x + y) / diag) * 720;
          const [hr, hg, hb] = hslToRgb(hue, 1, 0.6);
          const r = Math.round(baseRGB[0] + (hr - baseRGB[0]) * t);
          const g = Math.round(baseRGB[1] + (hg - baseRGB[1]) * t);
          const b = Math.round(baseRGB[2] + (hb - baseRGB[2]) * t);
          const size = dotSize + t * dotSize * 2.2;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      container.removeEventListener("touchmove", onTouch);
      container.removeEventListener("touchend", onLeave);
    };
  }, [dotColor, highlightColor, backgroundColor, dotSize, dotSpacing, influenceRadius]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)",
        }}
      />
    </div>
  );
};

export default SeoAeoHero;
